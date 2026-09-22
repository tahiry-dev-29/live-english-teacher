import { Injectable } from '@angular/core';
import type {
  SpeechRecognitionCtor,
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from './voice-call.types';

export interface SignalingHandlers {
  onInterim(text: string): void;
  onFinal(text: string): void;
  /** Ask the owner whether auto-restart is still wanted. */
  shouldRestart(): boolean;
}

/**
 * Browser SpeechRecognition lifecycle (T93 split from VoiceCallService):
 * create/start/stop + network-error and onend auto-restart.
 */
@Injectable({ providedIn: 'root' })
export class VoiceCallSignalingService {
  private recognition: SpeechRecognitionLike | null = null;
  private active = false;

  get isActive(): boolean {
    return this.active;
  }

  start(lang: string, handlers: SignalingHandlers): void {
    this.stop();
    const Ctor = resolveCtor();
    if (!Ctor) return;
    this.recognition = new Ctor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = lang;

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim || final) handlers.onInterim(interim || final);
      if (final) handlers.onFinal(final);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'network') {
        window.setTimeout(() => {
          if (handlers.shouldRestart() && !this.active) this.tryStart();
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      this.active = false;
      if (handlers.shouldRestart()) {
        window.setTimeout(() => {
          if (handlers.shouldRestart() && !this.active) this.tryStart();
        }, 100);
      }
    };

    this.tryStart();
  }

  notifyPaused(): void {
    this.active = false;
  }

  stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore — recognition already stopped
      }
      this.recognition = null;
    }
    this.active = false;
  }

  private tryStart(): void {
    if (!this.recognition) return;
    try {
      this.recognition.start();
      this.active = true;
    } catch {
      // ignore — start() throws when called twice in a row
    }
  }
}

function resolveCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
