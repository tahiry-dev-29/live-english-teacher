import { Injectable, inject, signal } from '@angular/core';
import { ElevenLabsVoiceService } from './elevenlabs-voice.service';

interface TtsSpeechOptions {
  voice?: SpeechSynthesisVoice;
  voiceId?: string;
  lang?: string;
  onEnd?: () => void;
  onError?: (error?: SpeechSynthesisErrorEvent | unknown) => void;
}

@Injectable({
  providedIn: 'root',
})
export class TtsService {
  private readonly elevenLabs = inject(ElevenLabsVoiceService);

  readonly isPlaying = signal<boolean>(false);
  readonly currentAudioTime = signal<number>(0);
  readonly totalAudioDuration = signal<number>(0);

  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;
  private readonly MAX_RETRIES = 2;
  private synthesisFailures = 0;
  private voicesChangedHandler: (() => void) | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;

  private cleanMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[*\-+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speak text. Tries ElevenLabs TTS first (high quality); falls back to Web Speech API.
   */
  async speak(text: string, options?: TtsSpeechOptions): Promise<void> {
    const cleanText = this.cleanMarkdown(text);
    if (!cleanText.trim()) {
      options?.onEnd?.();
      return;
    }

    this.stop();

    const selectedVoiceId = options?.voiceId || this.elevenLabs.selectedVoiceId();

    // 1. Try ElevenLabs TTS
    try {
      const elevenAudio = await this.elevenLabs.generateSpeechAudio(
        cleanText,
        selectedVoiceId,
        options?.lang
      );

      if (elevenAudio) {
        this.playElevenLabsAudio(elevenAudio.audioData, elevenAudio.mimeType, cleanText, options);
        return;
      }
    } catch (err) {
      console.warn('ElevenLabs TTS failed, falling back to Web Speech:', err);
    }

    // 2. Fallback to Web Speech API
    if (window.speechSynthesis.getVoices().length === 0) {
      this.waitForVoices(cleanText, options);
      return;
    }

    this.speakWebSpeech(cleanText, options);
  }

  private playElevenLabsAudio(
    base64Data: string,
    mimeType: string,
    fallbackText: string,
    options?: TtsSpeechOptions
  ): void {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      this.audioUrl = URL.createObjectURL(blob);
      this.currentAudio = new Audio(this.audioUrl);

      this.currentAudio.onloadedmetadata = () => {
        if (this.currentAudio) {
          this.totalAudioDuration.set(this.currentAudio.duration);
        }
      };

      this.currentAudio.onended = () => {
        this.stopProgressTracking();
        this.isPlaying.set(false);
        this.currentAudioTime.set(0);
        this.cleanupAudio();
        options?.onEnd?.();
      };

      this.currentAudio.onerror = () => {
        this.stopProgressTracking();
        this.isPlaying.set(false);
        this.cleanupAudio();
        console.warn('Audio playback error, fallback to Web Speech');
        this.speakWebSpeech(fallbackText, options);
      };

      this.isPlaying.set(true);
      this.currentAudioTime.set(0);

      this.currentAudio.play().then(() => {
        this.startProgressTracking();
      }).catch((playErr) => {
        console.warn('Audio play error, fallback to Web Speech:', playErr);
        this.speakWebSpeech(fallbackText, options);
      });
    } catch {
      this.speakWebSpeech(fallbackText, options);
    }
  }

  private speakWebSpeech(cleanText: string, options?: TtsSpeechOptions): void {
    this.clearSpeech();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = this.resolveVoice(options?.voice, options?.lang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else if (options?.lang) {
      utterance.lang = options.lang;
    }
    this.currentUtterance = utterance;

    this.isPlaying.set(true);
    this.currentAudioTime.set(0);

    const wordCount = cleanText.split(' ').length;
    const estimatedDuration = (wordCount / 150) * 60;
    this.totalAudioDuration.set(estimatedDuration);

    const startTime = Date.now();
    this.startProgressTracking(startTime, estimatedDuration);

    utterance.onend = () => {
      this.stopProgressTracking();
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;
      this.synthesisFailures = 0;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.stopProgressTracking();
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;

      if (
        e.error === 'synthesis-failed' &&
        this.synthesisFailures < this.MAX_RETRIES
      ) {
        this.synthesisFailures += 1;
        setTimeout(() => this.speakWebSpeech(cleanText, options), 300);
        return;
      }

      this.synthesisFailures = 0;
      options?.onError?.(e);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      this.stopProgressTracking();
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;
      this.synthesisFailures = 0;
      console.error('TTS speak() failed:', error);
      options?.onError?.(error);
    }
  }

  private startProgressTracking(startTime?: number, estimatedDuration?: number): void {
    this.stopProgressTracking();
    const start = startTime || Date.now();

    this.progressInterval = setInterval(() => {
      if (!this.isPlaying()) {
        this.stopProgressTracking();
        return;
      }
      if (this.currentAudio) {
        this.currentAudioTime.set(this.currentAudio.currentTime);
      } else if (estimatedDuration) {
        const elapsed = (Date.now() - start) / 1000;
        this.currentAudioTime.set(Math.min(elapsed, estimatedDuration));
      }
    }, 100);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private resolveVoice(
    preferred: SpeechSynthesisVoice | undefined,
    lang: string | undefined
  ): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (preferred && voices.some((v) => v.name === preferred.name)) {
      return preferred;
    }

    const langCode = (lang || 'en-US').split('-')[0].toLowerCase();
    const matching = voices.find((v) =>
      v.lang.toLowerCase().startsWith(langCode)
    );
    if (matching) return matching;

    return voices.find((v) => v.default) || voices[0] || null;
  }

  private waitForVoices(cleanText: string, options?: TtsSpeechOptions): void {
    const synthesis = window.speechSynthesis;
    const handler = (): void => {
      if (this.voicesChangedHandler) {
        synthesis.removeEventListener(
          'voiceschanged',
          this.voicesChangedHandler
        );
        this.voicesChangedHandler = null;
      }
      this.speakWebSpeech(cleanText, options);
    };

    this.voicesChangedHandler = handler;
    synthesis.addEventListener('voiceschanged', handler);
    setTimeout(handler, 1200);
  }

  private clearSpeech(): void {
    const synthesis = window.speechSynthesis;
    try {
      synthesis.cancel();
      synthesis.resume();
    } catch {
      // ignore
    }
  }

  private cleanupAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
  }

  stop(): void {
    this.stopProgressTracking();
    this.cleanupAudio();
    this.clearSpeech();
    this.synthesisFailures = 0;
    this.isPlaying.set(false);
    this.currentAudioTime.set(0);
    this.currentUtterance = null;
  }

  pause(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    } else if (this.isPlaying()) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (this.currentAudio) {
      this.currentAudio.play();
    } else if (this.isPlaying()) {
      window.speechSynthesis.resume();
    }
  }
}
