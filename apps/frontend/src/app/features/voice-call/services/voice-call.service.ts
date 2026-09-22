import { Injectable, inject, signal } from '@angular/core';
import { VadService } from './vad.service';
import { VoiceCallSignalingService } from './voice-call-signaling.service';
import {
  CallState,
  resolveSpeechLang,
  type VoiceCallCallbacks,
} from './voice-call.types';
import {
  pickRecordingMimeType,
  transcribeRecorderTake,
} from './voice-call-audio.util';
import { ChatAudioService } from '@features/chat/services/chat-audio.service';
import { MESSAGES } from '@core/constants/messages';
import { LoggingService } from '@core/services/logging.service';
import { createInactivityTimer } from './call-inactivity.util';

export { CallState };
export type { VoiceCallCallbacks };

@Injectable({
  providedIn: 'root',
})
export class VoiceCallService {
  private readonly logger = inject(LoggingService);
  private readonly vadService = inject(VadService);
  private readonly signaling = inject(VoiceCallSignalingService);
  private readonly chatAudio = inject(ChatAudioService);

  readonly callState = signal<CallState>(CallState.IDLE);
  readonly currentTranscript = signal<string>('');

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private readonly inactivity = createInactivityTimer(10000, () =>
    this.onInactivity?.(),
  );

  private onTranscriptReady?: (text: string) => void;
  private onInactivity?: () => void;
  private onStateChange?: (state: CallState) => void;
  private language = 'en-US';
  private targetLanguageCode = 'en';

  async startCall(callbacks: VoiceCallCallbacks): Promise<void> {
    this.onTranscriptReady = callbacks.onTranscriptReady;
    this.onInactivity = callbacks.onInactivity;
    this.onStateChange = callbacks.onStateChange;
    this.targetLanguageCode = callbacks.language || 'en';
    this.language = resolveSpeechLang(callbacks.language);

    try {
      await this.vadService.start({
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: () => this.handleSpeechEnd(),
      });

      this.setupMediaRecorder();
      this.signaling.start(this.language, {
        onInterim: (text) => this.currentTranscript.set(text),
        onFinal: (text) => {
          this.currentTranscript.set(text);
          this.processTranscript(text);
        },
        shouldRestart: () => this.callState() === CallState.LISTENING,
      });

      this.setState(CallState.LISTENING);
      this.inactivity.start();
    } catch (error) {
      this.logger.error(MESSAGES.log.voiceCallStartFailed, error);
      throw error;
    }
  }

  stopCall(): void {
    this.vadService.stop();
    this.stopRecorder();
    this.signaling.stop();
    this.inactivity.clear();
    this.setState(CallState.IDLE);
    this.currentTranscript.set('');
  }

  startSpeaking(): void {
    this.setState(CallState.SPEAKING);
    this.inactivity.clear();
    this.signaling.stop();
  }

  finishSpeaking(): void {
    this.setState(CallState.LISTENING);
    this.inactivity.start();
    if (!this.signaling.isActive) {
      this.signaling.start(this.language, this.signalingHandlers());
    }
  }

  private signalingHandlers() {
    return {
      onInterim: (text: string) => this.currentTranscript.set(text),
      onFinal: (text: string) => {
        this.currentTranscript.set(text);
        this.processTranscript(text);
      },
      shouldRestart: () => this.callState() === CallState.LISTENING,
    };
  }

  private stopRecorder(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  private setupMediaRecorder(): void {
    try {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const mimeType = pickRecordingMimeType();
          this.mediaRecorder = new MediaRecorder(stream, { mimeType });
          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.audioChunks.push(event.data);
          };
          this.mediaRecorder.onstop = () => {
            const chunks = this.audioChunks;
            this.audioChunks = [];
            void transcribeRecorderTake(
              chunks,
              mimeType,
              this.targetLanguageCode,
              (base64, mime, lang) =>
                this.chatAudio.transcribe(base64, mime, lang),
              (transcript) => {
                this.currentTranscript.set(transcript);
                this.processTranscript(transcript);
              },
            );
          };
        })
        .catch((e) => {
          this.logger.warn(MESSAGES.log.mediaRecorderSetupFailed, e);
        });
    } catch (e) {
      this.logger.warn(MESSAGES.log.mediaRecorderFailed, e);
    }
  }

  private handleSpeechStart(): void {
    this.inactivity.clear();
    this.inactivity.start();
    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      this.audioChunks = [];
      try {
        this.mediaRecorder.start();
      } catch {
        // ignore
      }
    }
  }

  private handleSpeechEnd(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
  }

  private processTranscript(transcript: string): void {
    if (!transcript.trim()) return;
    this.setState(CallState.PROCESSING);
    this.inactivity.clear();
    this.signaling.stop();
    this.onTranscriptReady?.(transcript);
  }

  private setState(state: CallState): void {
    this.callState.set(state);
    this.onStateChange?.(state);
  }

  getCurrentState(): CallState {
    return this.callState();
  }
}
