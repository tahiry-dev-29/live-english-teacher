import { Injectable, signal } from '@angular/core';

interface TtsSpeechOptions {
  voice?: SpeechSynthesisVoice;
  lang?: string;
  onEnd?: () => void;
  onError?: (error?: SpeechSynthesisErrorEvent) => void;
}

@Injectable({
  providedIn: 'root',
})
export class TtsService {
  isPlaying = signal(false);
  currentAudioTime = signal(0);
  totalAudioDuration = signal(0);

  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private readonly MAX_RETRIES = 2;
  private synthesisFailures = 0;
  private voicesChangedHandler: (() => void) | null = null;

  private cleanMarkdown(text: string): string {
    return text

      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/```[\s\S]*?```/g, '') // ```code```
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '') // # Header
      .replace(/^[*\-+]\s+/gm, '') // * item
      .replace(/^\d+\.\s+/gm, '') // 1. item
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speak text using Web Speech API.
   */
  speak(text: string, options?: TtsSpeechOptions): void {
    const cleanText = this.cleanMarkdown(text);
    if (!cleanText.trim()) {
      options?.onEnd?.();
      return;
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      this.waitForVoices(cleanText, options);
      return;
    }

    this.speakInternal(cleanText, options);
  }

  private speakInternal(cleanText: string, options?: TtsSpeechOptions): void {
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
    const progressInterval = setInterval(() => {
      if (!this.isPlaying()) {
        clearInterval(progressInterval);
        return;
      }
      const elapsed = (Date.now() - startTime) / 1000;
      this.currentAudioTime.set(Math.min(elapsed, estimatedDuration));
    }, 100);

    utterance.onend = () => {
      clearInterval(progressInterval);
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;
      this.synthesisFailures = 0;

      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      clearInterval(progressInterval);
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;

      if (
        e.error === 'synthesis-failed' &&
        this.synthesisFailures < this.MAX_RETRIES
      ) {
        this.synthesisFailures += 1;
        setTimeout(() => this.speakInternal(cleanText, options), 300);
        return;
      }

      this.synthesisFailures = 0;
      options?.onError?.(e);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      clearInterval(progressInterval);
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;
      this.synthesisFailures = 0;
      console.error('TTS speak() failed:', error);
      options?.onError?.();
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
      this.speakInternal(cleanText, options);
    };

    this.voicesChangedHandler = handler;
    synthesis.addEventListener('voiceschanged', handler);
    setTimeout(handler, 1200);
  }

  private clearSpeech(): void {
    const synthesis = window.speechSynthesis;
    try {
      synthesis.cancel();
      // Chromium workaround: resume() unblocks a stuck "paused" engine.
      synthesis.resume();
    } catch {
      // ignore engine quirks
    }
  }

  stop(): void {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore engine quirks
    }
    this.synthesisFailures = 0;
    this.isPlaying.set(false);
    this.currentAudioTime.set(0);
    this.currentUtterance = null;
  }

  pause(): void {
    if (this.isPlaying()) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (this.isPlaying()) {
      window.speechSynthesis.resume();
    }
  }
}
