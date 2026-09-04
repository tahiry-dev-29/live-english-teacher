import { Injectable, inject, signal } from '@angular/core';
import { VadService } from './vad.service';

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
  private vadService = inject(VadService);

  callState = signal<CallState>(CallState.IDLE);
  currentTranscript = signal<string>('');

  // Speech Recognition
  private recognition: SpeechRecognitionLike | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_TIMEOUT = 10000; // 10 seconds

  // Callbacks
  private onTranscriptReady?: (text: string) => void;
  private onInactivity?: () => void;
  private onStateChange?: (state: CallState) => void;
  private language = 'en-US';

  async startCall(callbacks: {
    onTranscriptReady?: (text: string) => void;
    onInactivity?: () => void;
    onStateChange?: (state: CallState) => void;
    language?: string;
  }): Promise<void> {
    this.onTranscriptReady = callbacks.onTranscriptReady;
    this.onInactivity = callbacks.onInactivity;
    this.onStateChange = callbacks.onStateChange;
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

      this.setupSpeechRecognition();

      this.setState(CallState.LISTENING);
      this.startInactivityTimer();

      console.log('Voice call started');
    } catch (error) {
      console.error('Error starting voice call:', error);
      throw error;
    }
  }

  private isRecognitionActive = false;

  stopCall(): void {
    this.vadService.stop();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore already stopped
      }
      this.isRecognitionActive = false;
      this.recognition = null;
    }

    this.clearInactivityTimer();

    this.setState(CallState.IDLE);
    this.currentTranscript.set('');

    console.log('Voice call stopped');
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
      console.error('Speech Recognition not supported');
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

      // Update current transcript
      this.currentTranscript.set(interimTranscript || finalTranscript);

      // If final transcript, process it
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
    console.log('VAD: Speech detected');

    this.clearInactivityTimer();
    this.startInactivityTimer();
  }

  private handleSpeechEnd(): void {
    console.log('VAD: Speech ended');
  }

  private processTranscript(transcript: string): void {
    if (!transcript.trim()) return;

    console.log('Processing transcript:', transcript);

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
      console.log('Inactivity timeout');
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
    console.log('Call state changed:', state);
  }

  getCurrentState(): CallState {
    return this.callState();
  }
}
