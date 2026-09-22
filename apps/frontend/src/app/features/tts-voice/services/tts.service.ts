import { Injectable, inject, signal } from '@angular/core';
import { ElevenLabsVoiceService } from './elevenlabs-voice.service';
import { TtsAudioCacheService } from './tts-audio-cache.service';
import { BrowserSpeechService } from './browser-speech.service';
import { TtsPlaybackService } from './tts-playback.service';
import {
  cleanMarkdownForSpeech,
  estimateSpeechDurationSeconds,
} from './tts-settings.util';
import { base64ToBlob } from '@core/utils/text.util';
import { MESSAGES } from '@core/constants/messages';
import { LoggingService } from '@core/services/logging.service';

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
  private readonly logger = inject(LoggingService);
  private readonly elevenLabs = inject(ElevenLabsVoiceService);
  private readonly browserSpeech = inject(BrowserSpeechService);
  private readonly audioCache = inject(TtsAudioCacheService);
  private readonly playback = inject(TtsPlaybackService);

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

  /**
   * Speak text. Tries the TTS API first; falls back to Web Speech always.
   * Retries the API when invoked from the play button after a failure.
   */
  async speak(text: string, options?: TtsSpeechOptions): Promise<void> {
    const cleanText = cleanMarkdownForSpeech(text);
    if (!cleanText.trim()) {
      options?.onEnd?.();
      return;
    }

    this.stop();
    this.lastText.set(cleanText);
    this.lastOptions = options;

    const selectedVoiceId =
      options?.voiceId || this.elevenLabs.selectedVoiceId();

    // 1. Try TTS API (with loading state for the play-button spinner).
    //    Cached audio (L1 memory / L2 IndexedDB) skips re-synthesis entirely.
    this.isLoading.set(true);
    try {
      const cacheKey = await this.audioCache.buildKey([
        cleanText,
        selectedVoiceId,
        this.elevenLabs.selectedModelId(),
        this.elevenLabs.selectedProviderId(),
        options?.lang,
      ]);
      const audioBlob = await this.audioCache.getOrFetch(cacheKey, () =>
        this.elevenLabs
          .generateSpeechAudio(cleanText, selectedVoiceId, options?.lang)
          .then((res) => {
            if (!res) throw new Error('tts-unavailable');
            return base64ToBlob(res.audioData, res.mimeType);
          })
          .catch((err: unknown) => {
            if (err instanceof Error && err.message === 'tts-unavailable') {
              this.logger.warn(
                MESSAGES.log.ttsUnavailable(
                  this.elevenLabs.selectedProviderId(),
                ),
              );
            } else {
              this.logger.warn(MESSAGES.log.ttsFallback, err);
            }
            throw err;
          }),
      );

      this.lastTtsFailed.set(false);
      this.isLoading.set(false);
      this.isPlaying.set(true);
      this.playback.play(audioBlob, {
        isActive: () => this.isPlaying(),
        onTimeUpdate: (s) => this.currentAudioTime.set(s),
        onDuration: (d) => this.totalAudioDuration.set(d),
        onLevels: (levels) => this.analyserLevels.set(levels),
        onEnded: () => {
          this.isPlaying.set(false);
          this.currentAudioTime.set(0);
          options?.onEnd?.();
        },
        onError: () => {
          this.isPlaying.set(false);
          this.logger.warn(MESSAGES.log.audioFallback);
          this.speakWebSpeech(cleanText, options);
        },
      });
      return;
    } catch (err) {
      this.lastTtsFailed.set(true);
      this.logger.warn(MESSAGES.log.ttsFallback, err);
    } finally {
      this.isLoading.set(false);
    }

    // 2. Fallback to Web Speech API (always available)
    this.speakWebSpeech(cleanText, options);
  }

  /** Retry the TTS API for the last spoken text (play button after failure). */
  async retryLast(): Promise<void> {
    const text = this.lastText();
    if (text) await this.speak(text, this.lastOptions);
  }

  /** Browser fallback — owned by BrowserSpeechService (chunked, voices). */
  private speakWebSpeech(cleanText: string, options?: TtsSpeechOptions): void {
    const estimatedDuration = estimateSpeechDurationSeconds(cleanText);
    const startTime = Date.now();
    this.browserSpeech.speak(cleanText, {
      voice: options?.voice,
      lang: options?.lang,
      onStart: () => {
        this.isPlaying.set(true);
        this.currentAudioTime.set(0);
        this.totalAudioDuration.set(estimatedDuration);
        this.playback.startProgressTracking(
          { onTimeUpdate: (s) => this.currentAudioTime.set(s) },
          startTime,
          estimatedDuration,
        );
        this.playback.startWebSpeechViz(
          () => this.isPlaying() && this.browserSpeech.active(),
          (levels) => this.analyserLevels.set(levels),
        );
      },
      onEnd: () => {
        this.finishWebSpeech();
        options?.onEnd?.();
      },
      onError: (error) => {
        this.finishWebSpeech();
        options?.onError?.(error);
      },
    });
  }

  /** Shared Web Speech teardown (end + error paths). */
  private finishWebSpeech(): void {
    this.playback.stopWebSpeechViz();
    this.playback.stopProgressTracking();
    this.isPlaying.set(false);
    this.currentAudioTime.set(0);
  }

  stop(): void {
    this.playback.stop();
    this.browserSpeech.stop();
    this.isPlaying.set(false);
    this.isLoading.set(false);
    this.currentAudioTime.set(0);
  }

  pause(): void {
    if (this.playback.pause()) {
      this.isPlaying.set(false);
    } else if (this.browserSpeech.active() && this.isPlaying()) {
      this.browserSpeech.pause();
      this.isPlaying.set(false);
      this.playback.stopProgressTracking();
    }
  }

  resume(): void {
    const resumed = this.playback.resume({
      onStarted: () => this.isPlaying.set(true),
      onTimeUpdate: (s) => this.currentAudioTime.set(s),
      onError: (error) =>
        this.logger.error(MESSAGES.log.audioPlayFailed, error),
    });
    if (!resumed && this.browserSpeech.active() && !this.isPlaying()) {
      this.browserSpeech.resume();
      this.isPlaying.set(true);
    }
  }

  seekTo(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const current = this.playback.seekTo(seconds);
    if (current !== null) this.currentAudioTime.set(current);
  }
}
