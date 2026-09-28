import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ElevenLabsVoiceService } from './elevenlabs-voice.service';
import { TtsSynthesisService } from './tts-synthesis.service';
import { TtsAudioCacheService } from './tts-audio-cache.service';
import { TtsPlaybackService } from './tts-playback.service';
import { cleanMarkdownForSpeech } from './tts-settings.util';
import { base64ToBlob } from '@core/utils/text.util';
import { MESSAGES } from '@core/constants/messages';
import { LoggingService } from '@core/services/logging.service';

interface TtsSpeechOptions {
  voiceId?: string;
  lang?: string;
  onEnd?: () => void;
  onError?: (error?: unknown) => void;
}

@Injectable({
  providedIn: 'root',
})
export class TtsService {
  private readonly logger = inject(LoggingService);
  private readonly elevenLabs = inject(ElevenLabsVoiceService);
  private readonly audioCache = inject(TtsAudioCacheService);
  private readonly playback = inject(TtsPlaybackService);
  private readonly synthesis = inject(TtsSynthesisService);

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
   * Speak text via server TTS APIs only (no browser synthesis).
   * On failure the error surfaces via onError + lastTtsFailed so the UI
   * prompts for an API key instead of silently falling back.
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

    // TTS API (cached audio in L1 memory / L2 IndexedDB skips re-synthesis).
    this.isLoading.set(true);
    try {
      const cacheKey = await this.audioCache.buildKey([
        cleanText,
        selectedVoiceId,
        this.elevenLabs.selectedModelId(),
        this.elevenLabs.selectedProviderId(),
        options?.lang,
      ]);
      const audioBlob = await this.audioCache.getOrFetch(cacheKey, async () => {
        const outcome = await firstValueFrom(
          this.synthesis.synthesize(cleanText, {
            voiceId: selectedVoiceId,
            lang: options?.lang,
          }),
        );
        // Rejection propagates (never cached): the interceptor toasts the cause.
        if (!outcome.ok) throw new Error(outcome.message);
        return base64ToBlob(outcome.audioData, outcome.mimeType);
      });

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
        onError: (error) => {
          this.isPlaying.set(false);
          this.fail(error, options);
        },
      });
      return;
    } catch (err) {
      this.fail(err, options);
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Retry the TTS API for the last spoken text (play button after failure). */
  async retryLast(): Promise<void> {
    const text = this.lastText();
    if (text) await this.speak(text, this.lastOptions);
  }

  /** Surface the failure: retry flag + caller hook (key prompt in UI). */
  private fail(error: unknown, options?: TtsSpeechOptions): void {
    this.lastTtsFailed.set(true);
    this.isPlaying.set(false);
    this.logger.warn(MESSAGES.log.ttsRequestFailed, error);
    options?.onError?.(error);
  }

  stop(): void {
    this.playback.stop();
    this.isPlaying.set(false);
    this.isLoading.set(false);
    this.currentAudioTime.set(0);
  }

  pause(): void {
    if (this.playback.pause()) {
      this.isPlaying.set(false);
    }
  }

  resume(): void {
    const resumed = this.playback.resume({
      onStarted: () => this.isPlaying.set(true),
      onTimeUpdate: (s) => this.currentAudioTime.set(s),
      onError: (error) =>
        this.logger.error(MESSAGES.log.audioPlayFailed, error),
    });
    if (!resumed) this.isPlaying.set(false);
  }

  seekTo(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const current = this.playback.seekTo(seconds);
    if (current !== null) this.currentAudioTime.set(current);
  }
}
