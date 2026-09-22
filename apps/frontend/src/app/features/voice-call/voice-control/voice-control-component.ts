import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  LucidePlay,
  LucidePause,
  LucideSquare,
  LucideLoader,
} from '@lucide/angular';
import {
  barHeightPx,
  buildFallbackBars,
  formatTimeSecs,
  isBarPlayed,
} from './voice-control.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-voice-control',
  standalone: true,
  imports: [LucidePlay, LucidePause, LucideSquare, LucideLoader],
  templateUrl: './voice-control.component.html',
  styleUrl: './voice-control.component.css',
})
export class VoiceControlComponent {
  readonly currentTime = input<number>(0);
  readonly totalDuration = input<number>(0);
  readonly playing = input<boolean>(true);
  /** True while the TTS HTTP request is in flight — spinner replaces the icon. */
  readonly loading = input<boolean>(false);
  /** True when the last TTS API call failed — next play press retries it. */
  readonly ttsFailed = input<boolean>(false);
  /** Real analyser levels (0..1) from TtsService — replaces fake waveform. */
  readonly levels = input<number[]>([]);

  readonly stopped = output<void>();
  readonly audioSeeked = output<number>();
  readonly paused = output<void>();
  readonly resumed = output<void>();
  readonly retryRequested = output<void>();

  readonly isPlaying = signal<boolean>(true);
  /** Live bars: real analyser levels when present, static fallback otherwise. */
  readonly waveformBars = computed<number[]>(() => {
    const live = this.levels();
    if (live.length > 0) return live;
    return this.fallbackBars;
  });
  private readonly fallbackBars: number[] = buildFallbackBars();

  protected readonly progress = computed<number>(() => {
    if (this.totalDuration() === 0) return 0;
    return (this.currentTime() / this.totalDuration()) * 100;
  });

  constructor() {
    effect(() => {
      this.isPlaying.set(this.playing());
    });
  }

  togglePlayPause(): void {
    // After a TTS API failure the play button re-calls the API (task 84).
    if (this.ttsFailed() && !this.isPlaying()) {
      this.retryRequested.emit();
      return;
    }
    this.isPlaying.update((v) => !v);
    if (this.isPlaying()) {
      this.resumed.emit();
    } else {
      this.paused.emit();
    }
  }

  stopPlayback(): void {
    this.isPlaying.set(false);
    this.stopped.emit();
  }

  seekToPosition(event: MouseEvent): void {
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * this.totalDuration();
    this.audioSeeked.emit(newTime);
  }

  handleKeydown(event: KeyboardEvent): void {
    const step = 5;
    let newTime = this.currentTime();

    if (event.key === 'ArrowRight') {
      newTime = Math.min(this.totalDuration(), newTime + step);
      this.audioSeeked.emit(newTime);
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      newTime = Math.max(0, newTime - step);
      this.audioSeeked.emit(newTime);
      event.preventDefault();
    } else if (event.key === ' ' || event.key === 'Enter') {
      this.togglePlayPause();
      event.preventDefault();
    }
  }

  isBarPlayed(index: number): boolean {
    return isBarPlayed(index, this.waveformBars().length, this.progress());
  }

  getBarHeight(value: number): number {
    return barHeightPx(value);
  }

  formatTime(seconds: number): string {
    return formatTimeSecs(seconds);
  }
}
