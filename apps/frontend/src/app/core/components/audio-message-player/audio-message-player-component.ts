import {
  Component,
  OnDestroy,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import { LucidePlay, LucidePause } from '@lucide/angular';
import { formatTime } from '@core/utils/time.util';
import { base64ToBlob } from '@core/utils/text.util';

@Component({
  selector: 'app-audio-message-player',
  standalone: true,
  imports: [LucidePlay, LucidePause],
  template: `
    <div
      class="audio-player bg-base-200/70 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3 max-w-xs border border-base-300 hover:bg-base-200 transition-colors"
    >
      <button
        (click)="togglePlay()"
        class="btn btn-circle btn-sm bg-primary text-primary-content border-none shadow-md transition-transform hover:scale-105"
        [attr.aria-label]="isPlaying() ? 'Pause' : 'Play'"
      >
        @if (isPlaying()) {
        <svg lucidePause class="w-5 h-5"></svg>
        } @else {
        <svg lucidePlay class="w-5 h-5 ml-0.5"></svg>
        }
      </button>

      <div class="flex-1 flex flex-col gap-1">
        <div
          class="flex items-center gap-0.5 h-8 cursor-pointer"
          role="slider"
          tabindex="0"
          [attr.aria-label]="'Seek audio'"
          [attr.aria-valuemin]="0"
          [attr.aria-valuemax]="duration()"
          [attr.aria-valuenow]="currentTime()"
          (click)="seekToPosition($event)"
          (keydown.arrowright)="seekBy(5)"
          (keydown.arrowleft)="seekBy(-5)"
          #waveformContainer
        >
          @for (bar of waveformBars(); track $index) {
          <div
            class="w-1 rounded-full transition-all duration-75"
            [class.bg-primary]="isBarPlayed($index)"
            [class.bg-base-300]="!isBarPlayed($index)"
            [style.height.px]="getBarHeight(bar)"
          ></div>
          }
        </div>

        <div
          class="flex justify-between text-[11px] text-base-content/60 font-mono"
        >
          <span>{{ formatTime(currentTime()) }}</span>
          <span>{{ formatTime(duration()) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class AudioMessagePlayerComponent implements OnDestroy {
  audioData = input.required<string>();
  mimeType = input<string>('audio/wav');
  isPlayingInput = input<boolean>(false);

  playRequested = output<void>();
  pauseRequested = output<void>();
  ended = output<void>();

  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  waveformBars = signal<number[]>([]);

  private audio: HTMLAudioElement | null = null;
  private animationFrameId: number | null = null;
  private audioUrl: string | null = null;

  constructor() {
    effect(() => {
      const isPlaying = this.isPlayingInput();
      if (isPlaying !== this.isPlaying()) {
        if (isPlaying) {
          this.playAudio();
        } else {
          this.pauseAudio();
        }
      }
    });

    effect(() => {
      const data = this.audioData();
      if (data) {
        this.initializeAudio(data);
      }
    });

    this.generateDummyWaveform();
  }

  ngOnDestroy(): void {
    this.cleanupAudio();
  }

  private initializeAudio(base64Data: string): void {
    this.cleanupAudio();

    try {
      const blob = base64ToBlob(base64Data, this.mimeType());
      this.audioUrl = URL.createObjectURL(blob);
      this.audio = new Audio(this.audioUrl);

      this.audio.onloadedmetadata = () => {
        if (this.audio) {
          this.duration.set(this.audio.duration);
        }
      };

      this.audio.onended = () => {
        this.isPlaying.set(false);
        this.currentTime.set(0);
        this.ended.emit();
        this.stopProgressTracking();
      };

      this.audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        this.isPlaying.set(false);
        this.stopProgressTracking();
      };
    } catch (error) {
      console.error('Error creating audio blob:', error);
    }
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.pauseAudio();
      this.pauseRequested.emit();
    } else {
      this.playAudio();
      this.playRequested.emit();
    }
  }

  private playAudio(): void {
    if (!this.audio) return;

    this.audio
      .play()
      .then(() => {
        this.isPlaying.set(true);
        this.startProgressTracking();
      })
      .catch((error) => {
        console.error('Failed to play audio:', error);
      });
  }

  private pauseAudio(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.isPlaying.set(false);
    this.stopProgressTracking();
  }

  private startProgressTracking(): void {
    const updateProgress = () => {
      if (this.audio && this.isPlaying()) {
        this.currentTime.set(this.audio.currentTime);
        this.animationFrameId = requestAnimationFrame(updateProgress);
      }
    };
    this.animationFrameId = requestAnimationFrame(updateProgress);
  }

  private stopProgressTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  seekToPosition(event: MouseEvent): void {
    if (!this.audio || !this.duration()) return;

    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));

    const newTime = percentage * this.duration();
    this.audio.currentTime = newTime;
    this.currentTime.set(newTime);
  }

  seekBy(seconds: number): void {
    if (!this.audio || !this.duration()) return;
    const newTime = Math.max(
      0,
      Math.min(this.duration(), this.currentTime() + seconds)
    );
    this.audio.currentTime = newTime;
    this.currentTime.set(newTime);
  }

  isBarPlayed(index: number): boolean {
    const totalBars = this.waveformBars().length;
    if (totalBars === 0 || this.duration() === 0) return false;
    const progress = this.currentTime() / this.duration();
    return index / totalBars <= progress;
  }

  getBarHeight(value: number): number {
    return Math.max(4, value * 28);
  }

  private generateDummyWaveform(): void {
    const bars: number[] = [];
    const count = 32;
    for (let i = 0; i < count; i++) {
      const value = 0.2 + Math.sin(i * 0.3) * 0.3 + Math.random() * 0.5;
      bars.push(Math.min(1, Math.max(0.1, value)));
    }
    this.waveformBars.set(bars);
  }

  private cleanupAudio(): void {
    this.stopProgressTracking();
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
  }

  formatTime(seconds: number): string {
    return formatTime(seconds);
  }
}
