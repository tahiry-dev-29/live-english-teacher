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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-voice-control',
  standalone: true,
  imports: [LucidePlay, LucidePause, LucideSquare, LucideLoader],
  template: `
    <div
      class="voice-control-bar flex h-12 w-[300px] min-w-0 items-center gap-1.5 overflow-hidden rounded-full border border-base-300/60 bg-base-200/95 py-0.5 pr-1.5 pl-0.5 shadow-md backdrop-blur-sm"
    >
      <button
        type="button"
        (click)="togglePlayPause()"
        class="btn btn-circle min-h-0 shrink-0 border-none shadow-sm btn-primary btn-sm"
        [attr.aria-label]="
          loading() ? 'Loading audio' : isPlaying() ? 'Pause' : 'Play'
        "
        [disabled]="loading()"
      >
        @if (loading()) {
          <svg lucideLoader class="h-3.5 w-3.5 animate-spin"></svg>
        } @else if (isPlaying()) {
          <svg lucidePause class="h-3.5 w-3.5"></svg>
        } @else {
          <svg lucidePlay class="ml-0.5 h-3.5 w-3.5"></svg>
        }
      </button>

      <div class="flex min-w-0 flex-1 flex-col justify-center gap-px">
        <div
          class="font-mono text-xs leading-none font-medium text-base-content/60 tabular-nums"
        >
          {{ formatTime(currentTime()) }}
          <span class="text-base-content/35"
            >/ {{ formatTime(totalDuration()) }}</span
          >
        </div>

        <div class="relative min-w-0 flex-1">
          <div
            class="relative flex h-5 w-full min-w-0 cursor-pointer items-center gap-px overflow-hidden"
            (click)="seekToPosition($event)"
            (keydown)="handleKeydown($event)"
            tabindex="0"
            role="slider"
            [attr.aria-label]="'Seek audio position'"
            [attr.aria-valuemin]="0"
            [attr.aria-valuemax]="totalDuration()"
            [attr.aria-valuenow]="currentTime()"
          >
            @for (bar of waveformBars(); track $index) {
              <div
                class="min-w-[1.5px] flex-1 rounded-full transition-all duration-75"
                [class.bg-primary]="isBarPlayed($index)"
                [class.bg-base-content/15]="!isBarPlayed($index)"
                [style.height.px]="getBarHeight(bar)"
              ></div>
            }
          </div>

          <div
            class="pointer-events-none absolute bottom-0 left-0 h-px rounded-full bg-primary transition-all duration-75"
            [style.width.%]="progress()"
          ></div>
        </div>
      </div>

      <button
        type="button"
        (click)="stopPlayback()"
        class="btn btn-circle h-6 min-h-0 w-6 shrink-0 btn-ghost text-base-content/50 btn-xs hover:text-error"
        [attr.aria-label]="'Stop'"
        title="Stop"
      >
        <svg lucideSquare class="h-3 w-3"></svg>
      </button>
    </div>
  `,
  styles: `
    .voice-control-bar {
      animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
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
  private readonly fallbackBars: number[] =
    VoiceControlComponent.buildFallback();

  private static buildFallback(): number[] {
    const bars: number[] = [];
    for (let i = 0; i < 48; i++) {
      bars.push(0.25 + Math.abs(Math.sin(i * 0.4)) * 0.4);
    }
    return bars;
  }

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
    const totalBars = this.waveformBars().length;
    if (totalBars === 0) return false;
    const barProgress = (index / totalBars) * 100;
    return barProgress <= this.progress();
  }

  getBarHeight(value: number): number {
    return Math.max(2, Math.min(15, value * 15));
  }

  formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
