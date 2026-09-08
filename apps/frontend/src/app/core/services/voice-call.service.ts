import { Injectable, inject, signal } from '@angular/core';
import { VadService } from './vad.service';
import { MessageService } from './message.service';

export enum CallState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking',
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number } & Record<number, SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

@Injectable({
  providedIn: 'root',
})
export class VoiceCallService {
  private readonly vadService = inject(VadService);
  private readonly messageService = inject(MessageService);

  readonly callState = signal<CallState>(CallState.IDLE);
  readonly currentTranscript = signal<string>('');

  // MediaRecorder for Whisper STT
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // Fallback Speech Recognition
  private recognition: SpeechRecognitionLike | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_TIMEOUT = 10000;

  // Callbacks
  private onTranscriptReady?: (text: string) => void;
  private onInactivity?: () => void;
  private onStateChange?: (state: CallState) => void;
  private language = 'en-US';
  private targetLanguageCode = 'en';

  async startCall(callbacks: {
    onTranscriptReady?: (text: string) => void;
    onInactivity?: () => void;
    onStateChange?: (state: CallState) => void;
    language?: string;
  }): Promise<void> {
    this.onTranscriptReady = callbacks.onTranscriptReady;
    this.onInactivity = callbacks.onInactivity;
    this.onStateChange = callbacks.onStateChange;
    this.targetLanguageCode = callbacks.language || 'en';
    const langMap: Record<string, string> = {
      en: 'en-US',
      fr: 'fr-FR',
      es: 'es-ES',
      de: 'de-DE',
      it: 'it-IT',
      ja: 'ja-JP',
    };
    const inputLang = callbacks.language || 'en-US';
    this.language = langMap[inputLang] || inputLang;

    try {
      await this.vadService.start({
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: () => this.handleSpeechEnd(),
      });

      this.setupMediaRecorder();
      this.setupSpeechRecognition();

      this.setState(CallState.LISTENING);
      this.startInactivityTimer();
    } catch (error) {
      console.error('Error starting voice call:', error);
      throw error;
    }
  }

  private isRecognitionActive = false;

  stopCall(): void {
    this.vadService.stop();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.mediaRecorder = null;
    this.audioChunks = [];

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isRecognitionActive = false;
      this.recognition = null;
    }

    this.clearInactivityTimer();

    this.setState(CallState.IDLE);
    this.currentTranscript.set('');
  }

  startSpeaking(): void {
    this.setState(CallState.SPEAKING);
    this.clearInactivityTimer();

    if (this.recognition && this.isRecognitionActive) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isRecognitionActive = false;
    }
  }

  finishSpeaking(): void {
    this.setState(CallState.LISTENING);
    this.startInactivityTimer();

    if (this.recognition && !this.isRecognitionActive) {
      try {
        this.recognition.start();
        this.isRecognitionActive = true;
      } catch {
        // ignore
      }
    }
  }

  private setupMediaRecorder(): void {
    try {
      // Create MediaRecorder from VAD stream or userMedia
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = async () => {
          if (this.audioChunks.length === 0) return;
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.audioChunks = [];

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            if (base64) {
              const transcript = await this.messageService.transcribeAudio(
                base64,
                mimeType,
                this.targetLanguageCode
              );

              if (transcript && transcript.trim()) {
                this.currentTranscript.set(transcript);
                this.processTranscript(transcript);
              }
            }
          };
          reader.readAsDataURL(audioBlob);
        };
      }).catch((e) => {
        console.warn('Could not setup MediaRecorder for Whisper:', e);
      });
    } catch (e) {
      console.warn('MediaRecorder error:', e);
    }
  }

  private setupSpeechRecognition(): void {
    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: SpeechRecognitionCtor;
          webkitSpeechRecognition?: SpeechRecognitionCtor;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      this.currentTranscript.set(interimTranscript || finalTranscript);

      if (finalTranscript) {
        this.processTranscript(finalTranscript);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'network') {
        setTimeout(() => {
          if (
            this.callState() === CallState.LISTENING &&
            !this.isRecognitionActive
          ) {
            try {
              this.recognition?.start();
              this.isRecognitionActive = true;
            } catch {
              // ignore
            }
          }
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      this.isRecognitionActive = false;
      if (this.callState() === CallState.LISTENING) {
        setTimeout(() => {
          if (
            this.callState() === CallState.LISTENING &&
            !this.isRecognitionActive
          ) {
            try {
              this.recognition?.start();
              this.isRecognitionActive = true;
            } catch {
              // ignore
            }
          }
        }, 100);
      }
    };

    try {
      this.recognition.start();
      this.isRecognitionActive = true;
    } catch {
      // ignore
    }
  }

  private handleSpeechStart(): void {
    this.clearInactivityTimer();
    this.startInactivityTimer();

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
    this.clearInactivityTimer();

    if (this.recognition && this.isRecognitionActive) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isRecognitionActive = false;
    }

    this.onTranscriptReady?.(transcript);
  }

  private startInactivityTimer(): void {
    this.clearInactivityTimer();

    this.inactivityTimer = setTimeout(() => {
      this.onInactivity?.();
    }, this.INACTIVITY_TIMEOUT);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private setState(state: CallState): void {
    this.callState.set(state);
    this.onStateChange?.(state);
  }

  getCurrentState(): CallState {
    return this.callState();
  }
}
