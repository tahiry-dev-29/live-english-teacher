import { Injectable, inject, signal } from '@angular/core';
import { ElevenLabsVoiceService } from './elevenlabs-voice.service';
import { base64ToBlob } from '@core/utils/text.util';
import { MESSAGES } from '@core/constants/messages';

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
  /** True while the TTS HTTP request is in flight (spinner on play button). */
  readonly isLoading = signal<boolean>(false);
  /** True when the last TTS API call failed (play press retries the API). */
  readonly lastTtsFailed = signal<boolean>(false);
  /** Real analyser levels (0..1, 48 bars) from the playing audio element. */
  readonly analyserLevels = signal<number[]>([]);
  /** Last spoken text — used for play-button retry after an API failure. */
  readonly lastText = signal<string>('');
  private lastOptions: TtsSpeechOptions | undefined;

  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserRaf: number | null = null;
  private webSpeechRaf: number | null = null;
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
   * Speak text. Tries TTS API first (high quality); always falls back to
   * Web Speech API when the API fails. `retryFromFailure=true` when invoked
   * from the play button after a previous failure.
   */
  async speak(text: string, options?: TtsSpeechOptions): Promise<void> {
    const cleanText = this.cleanMarkdown(text);
    if (!cleanText.trim()) {
      options?.onEnd?.();
      return;
    }

    this.stop();

    this.lastText.set(cleanText);
    this.lastOptions = options;

    const selectedVoiceId =
      options?.voiceId || this.elevenLabs.selectedVoiceId();

    // 1. Try TTS API (with loading state for the play-button spinner)
    this.isLoading.set(true);
    try {
      const elevenAudio = await this.elevenLabs.generateSpeechAudio(
        cleanText,
        selectedVoiceId,
        options?.lang,
      );

      if (elevenAudio) {
        this.lastTtsFailed.set(false);
        this.isLoading.set(false);
        this.playElevenLabsAudio(
          elevenAudio.audioData,
          elevenAudio.mimeType,
          cleanText,
          options,
        );
        return;
      }
      this.lastTtsFailed.set(true);
    } catch (err) {
      this.lastTtsFailed.set(true);
      console.warn(MESSAGES.log.ttsFallback, err);
    } finally {
      this.isLoading.set(false);
    }

    // 2. Fallback to Web Speech API (always available)
    this.speakWebSpeech(cleanText, options);
  }

  /** Retry the TTS API for the last spoken text (play button after failure). */
  async retryLast(): Promise<void> {
    const text = this.lastText();
    if (!text) return;
    await this.speak(text, this.lastOptions);
  }

  private playElevenLabsAudio(
    base64Data: string,
    mimeType: string,
    fallbackText: string,
    options?: TtsSpeechOptions,
  ): void {
    try {
      const blob = base64ToBlob(base64Data, mimeType);

      this.audioUrl = URL.createObjectURL(blob);
      this.currentAudio = new Audio(this.audioUrl);

      this.currentAudio.onloadedmetadata = () => {
        if (this.currentAudio) {
          this.totalAudioDuration.set(this.currentAudio.duration);
        }
      };

      this.currentAudio.onended = () => {
        this.stopAnalyser();
        this.stopProgressTracking();
        this.isPlaying.set(false);
        this.currentAudioTime.set(0);
        this.cleanupAudio();
        options?.onEnd?.();
      };

      this.currentAudio.onerror = () => {
        this.stopAnalyser();
        this.stopProgressTracking();
        this.isPlaying.set(false);
        this.cleanupAudio();
        console.warn(MESSAGES.log.audioFallback);
        this.speakWebSpeech(fallbackText, options);
      };

      this.isPlaying.set(true);
      this.currentAudioTime.set(0);

      this.currentAudio
        .play()
        .then(() => {
          this.startProgressTracking();
          this.startAnalyser();
        })
        .catch((playErr) => {
          console.warn(MESSAGES.log.audioFallbackFailed, playErr);
          this.speakWebSpeech(fallbackText, options);
        });
    } catch {
      this.speakWebSpeech(fallbackText, options);
    }
  }

  private speakWebSpeech(cleanText: string, options?: TtsSpeechOptions): void {
    // Voices may load async — wait for them instead of speaking voiceless.
    if (
      typeof window !== 'undefined' &&
      window.speechSynthesis.getVoices().length === 0
    ) {
      this.waitForVoices(cleanText, options);
      return;
    }
    this.clearSpeech();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = this.resolveVoice(options?.voice, options?.lang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else if (options?.lang) {
      utterance.lang = options.lang;
    }
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    this.currentUtterance = utterance;

    this.isPlaying.set(true);
    this.currentAudioTime.set(0);

    const wordCount = cleanText.split(' ').length;
    const estimatedDuration = (wordCount / 150) * 60;
    this.totalAudioDuration.set(estimatedDuration);

    const startTime = Date.now();
    this.startProgressTracking(startTime, estimatedDuration);

    utterance.onend = () => {
      this.stopWebSpeechViz();
      this.stopProgressTracking();
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;
      this.synthesisFailures = 0;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.stopWebSpeechViz();
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
      this.startWebSpeechViz();
    } catch (error) {
      this.stopWebSpeechViz();
      this.stopProgressTracking();
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;
      this.synthesisFailures = 0;
      console.error(MESSAGES.log.ttsSpeakFailed, error);
      options?.onError?.(error);
    }
  }

  /**
   * Real visualization (task 84): Web Audio AnalyserNode on the playing
   * <audio> element. Falls back to flat silence levels when unavailable.
   */
  private startAnalyser(): void {
    try {
      if (!this.currentAudio || typeof window === 'undefined') return;
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      if (!this.audioContext) this.audioContext = new AC();
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') void ctx.resume();
      const src = ctx.createMediaElementSource(this.currentAudio);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 128;
      src.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      const bins = new Uint8Array(this.analyser.frequencyBinCount);
      const tick = (): void => {
        if (!this.analyser || !this.isPlaying()) return;
        this.analyser.getByteFrequencyData(bins);
        this.analyserLevels.set(this.downsampleBins(bins, 48));
        this.analyserRaf = requestAnimationFrame(tick);
      };
      this.analyserRaf = requestAnimationFrame(tick);
    } catch {
      // Analyser unavailable — widget keeps last/static levels.
    }
  }

  private stopAnalyser(): void {
    if (this.analyserRaf !== null) {
      cancelAnimationFrame(this.analyserRaf);
      this.analyserRaf = null;
    }
    try {
      this.analyser?.disconnect();
    } catch {
      // ignore
    }
    this.analyser = null;
  }

  /** Animated state-driven bars for Web Speech utterances (no audio node). */
  private startWebSpeechViz(): void {
    this.stopWebSpeechViz();
    const start = Date.now();
    const tick = (): void => {
      if (!this.isPlaying() || !this.currentUtterance) return;
      const t = (Date.now() - start) / 1000;
      const levels: number[] = [];
      for (let i = 0; i < 48; i++) {
        const v =
          0.35 +
          0.3 * Math.sin(t * 6 + i * 0.45) +
          0.2 * Math.sin(t * 11 + i * 0.9);
        levels.push(Math.min(1, Math.max(0.12, v)));
      }
      this.analyserLevels.set(levels);
      this.webSpeechRaf = requestAnimationFrame(tick);
    };
    this.webSpeechRaf = requestAnimationFrame(tick);
  }

  private stopWebSpeechViz(): void {
    if (this.webSpeechRaf !== null) {
      cancelAnimationFrame(this.webSpeechRaf);
      this.webSpeechRaf = null;
    }
  }

  private downsampleBins(bins: Uint8Array, target: number): number[] {
    const out: number[] = [];
    const per = Math.max(1, Math.floor(bins.length / target));
    for (let i = 0; i < target; i++) {
      let sum = 0;
      let n = 0;
      for (let j = i * per; j < Math.min(bins.length, (i + 1) * per); j++) {
        sum += (bins[j] ?? 0) / 255;
        n++;
      }
      out.push(n > 0 ? Math.min(1, Math.max(0.08, sum / n)) : 0.08);
    }
    return out;
  }

  private startProgressTracking(
    startTime?: number,
    estimatedDuration?: number,
  ): void {
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
    lang: string | undefined,
  ): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (preferred && voices.some((v) => v.name === preferred.name)) {
      return preferred;
    }

    const langCode = (lang || 'en-US').split('-')[0].toLowerCase();
    const matching = voices.find((v) =>
      v.lang.toLowerCase().startsWith(langCode),
    );
    if (matching) return matching;

    return voices.find((v) => v.default) || voices[0] || null;
  }

  private waitForVoices(cleanText: string, options?: TtsSpeechOptions): void {
    const synthesis = window.speechSynthesis;
    let settled = false;
    const cleanup = (): void => {
      if (this.voicesChangedHandler) {
        synthesis.removeEventListener(
          'voiceschanged',
          this.voicesChangedHandler,
        );
        this.voicesChangedHandler = null;
      }
    };

    const handler = (): void => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      cleanup();
      this.speakWebSpeech(cleanText, options);
    };

    this.voicesChangedHandler = handler;
    synthesis.addEventListener('voiceschanged', handler);
    const timeoutId = setTimeout(handler, 1200);
  }

  private clearSpeech(): void {
    const synthesis = window.speechSynthesis;
    try {
      if (synthesis.speaking || synthesis.pending) {
        synthesis.cancel();
      }
      if (synthesis.paused) {
        synthesis.resume();
      }
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
    this.stopAnalyser();
    this.stopWebSpeechViz();
    this.stopProgressTracking();
    this.cleanupAudio();
    this.clearSpeech();
    this.synthesisFailures = 0;
    this.isPlaying.set(false);
    this.isLoading.set(false);
    this.currentAudioTime.set(0);
    this.currentUtterance = null;
  }

  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.isPlaying.set(false);
      this.stopProgressTracking();
    } else if (this.currentUtterance && this.isPlaying()) {
      window.speechSynthesis.pause();
      this.isPlaying.set(false);
      this.stopProgressTracking();
    }
  }

  resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio
        .play()
        .then(() => {
          this.isPlaying.set(true);
          this.startProgressTracking();
        })
        .catch((error) => {
          console.error(MESSAGES.log.audioPlayFailed, error);
        });
    } else if (this.currentUtterance && !this.isPlaying()) {
      window.speechSynthesis.resume();
      this.isPlaying.set(true);
      this.startProgressTracking();
    }
  }

  seekTo(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    if (this.currentAudio && Number.isFinite(this.currentAudio.duration)) {
      const clamped = Math.max(
        0,
        Math.min(this.currentAudio.duration || 0, seconds),
      );
      this.currentAudio.currentTime = clamped;
      this.currentAudioTime.set(clamped);
    }
  }
}
