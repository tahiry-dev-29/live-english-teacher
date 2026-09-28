import { Injectable } from '@angular/core';
import { downsampleBins } from './tts-settings.util';

/** Callbacks wiring playback-element events back to the facade signals. */
export interface TtsPlaybackHooks {
  isActive: () => boolean;
  onTimeUpdate: (seconds: number) => void;
  onDuration: (seconds: number) => void;
  onLevels: (levels: number[]) => void;
  onEnded: () => void;
  onError: (error?: unknown) => void;
}

/**
 * HTMLAudio element lifecycle (T94 split): object URL, analyser, progress
 * ticker. Facade keeps signals; this drives elements only. Server audio
 * only — no browser synthesis path.
 */
@Injectable({
  providedIn: 'root',
})
export class TtsPlaybackService {
  private currentAudio: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserRaf: number | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;

  play(blob: Blob, hooks: TtsPlaybackHooks): void {
    try {
      this.audioUrl = URL.createObjectURL(blob);
      this.currentAudio = new Audio(this.audioUrl);
      this.currentAudio.onloadedmetadata = () => {
        if (this.currentAudio) hooks.onDuration(this.currentAudio.duration);
      };
      this.currentAudio.onended = () => {
        this.teardownPlayback();
        hooks.onEnded();
      };
      this.currentAudio.onerror = () => {
        this.teardownPlayback();
        hooks.onError(new Error('TTS playback failed.'));
      };
      hooks.onTimeUpdate(0);
      this.currentAudio
        .play()
        .then(() => {
          this.startProgressTracking(hooks);
          this.startAnalyser(hooks);
        })
        .catch((error: unknown) => hooks.onError(error));
    } catch (error) {
      hooks.onError(error);
    }
  }

  pause(): boolean {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.stopProgressTracking();
      return true;
    }
    return false;
  }

  resume(hooks: {
    onStarted: () => void;
    onTimeUpdate: (seconds: number) => void;
    onError: (error: unknown) => void;
  }): boolean {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio
        .play()
        .then(() => {
          hooks.onStarted();
          this.startProgressTracking(hooks);
        })
        .catch((error: unknown) => hooks.onError(error));
      return true;
    }
    return false;
  }

  seekTo(seconds: number): number | null {
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    if (this.currentAudio && Number.isFinite(this.currentAudio.duration)) {
      const clamped = Math.max(
        0,
        Math.min(this.currentAudio.duration || 0, seconds),
      );
      this.currentAudio.currentTime = clamped;
      return clamped;
    }
    return null;
  }

  stop(): void {
    this.teardownPlayback();
  }

  /** Shared teardown for ended/error/stop paths. */
  private teardownPlayback(): void {
    this.stopAnalyser();
    this.stopProgressTracking();
    this.cleanupAudio();
  }

  /** Real visualization: Web Audio AnalyserNode on the playing element. */
  private startAnalyser(hooks: TtsPlaybackHooks): void {
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
        if (!this.analyser || !hooks.isActive()) return;
        this.analyser.getByteFrequencyData(bins);
        hooks.onLevels(downsampleBins(bins, 48));
        this.analyserRaf = requestAnimationFrame(tick);
      };
      this.analyserRaf = requestAnimationFrame(tick);
    } catch {
      // Analyser unavailable — widget keeps last/static levels.
    }
  }

  private stopAnalyser(): void {
    if (this.analyserRaf !== null) cancelAnimationFrame(this.analyserRaf);
    this.analyserRaf = null;
    try {
      this.analyser?.disconnect();
    } catch {
      /* ignore */
    }
    this.analyser = null;
  }

  /** Live progress ticker from the audio element clock. */
  startProgressTracking(hooks: Pick<TtsPlaybackHooks, 'onTimeUpdate'>): void {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      if (this.currentAudio) {
        hooks.onTimeUpdate(this.currentAudio.currentTime);
      } else {
        this.stopProgressTracking();
      }
    }, 100);
  }

  stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private cleanupAudio(): void {
    this.currentAudio?.pause();
    this.currentAudio = null;
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null;
  }
}
