import { Injectable, signal, inject } from '@angular/core';
import { BrowserVoiceService } from './browser-voice.service';
import { splitChunks } from '@core/utils/browser-speech.util';

export interface BrowserSpeakOptions {
  voiceName?: string;
  voice?: SpeechSynthesisVoice;
  lang?: string;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error?: unknown) => void;
}

const CANCEL_SETTLE_MS = 70;
const MAX_CHUNK_RETRIES = 1;

/**
 * Web Speech utterance engine: chunked speaking (Chrome cuts single
 * utterances after ~15 s), cancel/settle timing, per-chunk retry.
 * Voice list + selection live in BrowserVoiceService. Never rejects —
 * failures go to onError.
 */
@Injectable({
  providedIn: 'root',
})
export class BrowserSpeechService {
  private readonly voices = inject(BrowserVoiceService);

  /** Active utterance chain, false when idle. */
  readonly active = signal<boolean>(false);

  private chainCancelled = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  speak(text: string, options?: BrowserSpeakOptions): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options?.onError?.(new Error('Web Speech not supported.'));
      return;
    }
    const clean = text.trim();
    if (!clean) {
      options?.onEnd?.();
      return;
    }
    this.voices.ensureVoices();
    const hadActive = this.cancelEngine();
    this.chainCancelled = false;
    this.active.set(true);

    const start = (): void => {
      if (this.chainCancelled) return;
      const chunks = splitChunks(clean);
      const voice = this.voices.resolveVoice({
        voiceName: options?.voiceName,
        voice: options?.voice,
        lang: options?.lang,
      });
      const lang = voice?.lang ?? options?.lang ?? 'en-US';
      options?.onStart?.();
      this.speakChunks(chunks, 0, voice, lang, options ?? {}, 0);
    };

    // Chrome drops speak() issued in the same tick as cancel().
    if (hadActive) setTimeout(start, CANCEL_SETTLE_MS);
    else start();
  }

  pause(): void {
    try {
      if (this.currentUtterance && this.active()) {
        window.speechSynthesis.pause();
      }
    } catch {
      // ignore
    }
  }

  resume(): void {
    try {
      if (this.currentUtterance && this.active()) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }

  stop(): void {
    this.cancelEngine();
  }

  private speakChunks(
    chunks: string[],
    index: number,
    voice: SpeechSynthesisVoice | null,
    lang: string,
    options: BrowserSpeakOptions,
    retries: number,
  ): void {
    if (this.chainCancelled || index >= chunks.length) {
      this.finish(true, options);
      return;
    }
    const utter = new SpeechSynthesisUtterance(chunks[index] ?? '');
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = lang;
    }
    utter.rate = options.rate ?? 1;
    utter.pitch = 1;
    utter.volume = 1;
    this.currentUtterance = utter;

    utter.onend = (): void => {
      if (this.chainCancelled) return;
      this.speakChunks(chunks, index + 1, voice, lang, options, 0);
    };
    utter.onerror = (): void => {
      if (this.chainCancelled) return;
      if (retries < MAX_CHUNK_RETRIES) {
        setTimeout(
          () =>
            this.speakChunks(chunks, index, voice, lang, options, retries + 1),
          300,
        );
        return;
      }
      // Skip the poisoned chunk instead of abandoning the message.
      this.speakChunks(chunks, index + 1, voice, lang, options, 0);
    };
    try {
      window.speechSynthesis.speak(utter);
    } catch (error) {
      this.finish(false, options, error);
    }
  }

  private finish(
    ok: boolean,
    options: BrowserSpeakOptions,
    error?: unknown,
  ): void {
    this.currentUtterance = null;
    this.active.set(false);
    if (ok) options.onEnd?.();
    else options.onError?.(error);
  }

  private stopChain(): void {
    this.chainCancelled = true;
    this.currentUtterance = null;
    this.active.set(false);
  }

  /** Cancel engine speech. Returns true when something was playing. */
  private cancelEngine(): boolean {
    this.stopChain();
    try {
      const synth = window.speechSynthesis;
      // Flags lie on some engines — cancel unconditionally, it is harmless
      // when idle and kills utterances the flags do not report.
      const had = synth.speaking || synth.pending || synth.paused;
      synth.cancel();
      if (synth.paused) synth.resume();
      return had;
    } catch {
      return false;
    }
  }
}
