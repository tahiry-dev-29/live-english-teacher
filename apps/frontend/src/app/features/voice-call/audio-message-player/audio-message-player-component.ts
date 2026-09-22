import {
  Component,
  OnDestroy,
  input,
  output,
  signal,
  effect,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { LucidePlay, LucidePause } from '@lucide/angular';
import { formatTime } from '@core/utils/time.util';
import { MESSAGES } from '@core/constants/messages';
import { LoggingService } from '@core/services/logging.service';
import { AudioPlaybackService } from './audio-playback.service';
import {
  generateWaveformBars,
  isBarPlayedByProgress,
  waveformBarHeight,
} from './audio-waveform.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audio-message-player',
  standalone: true,
  imports: [LucidePlay, LucidePause],
  providers: [AudioPlaybackService],
  templateUrl: './audio-message-player.component.html',
  styleUrl: './audio-message-player.component.css',
})
export class AudioMessagePlayerComponent implements OnDestroy {
  private readonly logger = inject(LoggingService);
  private readonly playback = inject(AudioPlaybackService);
  readonly audioData = input.required<string>();
  readonly mimeType = input<string>('audio/wav');
  readonly isPlayingInput = input<boolean>(false);

  readonly playRequested = output<void>();
  readonly pauseRequested = output<void>();
  readonly audioEnded = output<void>();

  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly waveformBars = signal<number[]>([]);

  private animationFrameId: number | null = null;

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

    this.waveformBars.set(generateWaveformBars());
  }

  ngOnDestroy(): void {
    this.cleanupAudio();
  }

  private initializeAudio(base64Data: string): void {
    this.cleanupAudio();

    try {
      this.playback.load(base64Data, this.mimeType(), {
        onDuration: (value) => this.duration.set(value),
        onEnded: () => {
          this.isPlaying.set(false);
          this.currentTime.set(0);
          this.audioEnded.emit();
          this.stopProgressTracking();
        },
        onError: (error) => {
          this.logger.error(MESSAGES.log.audioPlaybackFailed, error);
          this.isPlaying.set(false);
          this.stopProgressTracking();
        },
      });
    } catch (error) {
      this.logger.error(MESSAGES.log.audioBlobFailed, error);
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
    this.playback
      .play()
      .then(() => {
        this.isPlaying.set(true);
        this.startProgressTracking();
      })
      .catch((error) => {
        this.logger.error(MESSAGES.log.audioPlayFailed, error);
      });
  }

  private pauseAudio(): void {
    this.playback.pause();
    this.isPlaying.set(false);
    this.stopProgressTracking();
  }

  private startProgressTracking(): void {
    const updateProgress = () => {
      if (this.isPlaying()) {
        this.currentTime.set(this.playback.getCurrentTime());
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
    if (!this.duration()) return;

    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));

    const newTime = percentage * this.duration();
    this.playback.seekTo(newTime);
    this.currentTime.set(newTime);
  }

  seekBy(seconds: number): void {
    if (!this.duration()) return;
    const newTime = Math.max(
      0,
      Math.min(this.duration(), this.currentTime() + seconds),
    );
    this.playback.seekTo(newTime);
    this.currentTime.set(newTime);
  }

  isBarPlayed(index: number): boolean {
    return isBarPlayedByProgress(
      index,
      this.waveformBars().length,
      this.currentTime(),
      this.duration(),
    );
  }

  getBarHeight(value: number): number {
    return waveformBarHeight(value);
  }

  private cleanupAudio(): void {
    this.stopProgressTracking();
    this.playback.dispose();
  }

  formatTime(seconds: number): string {
    return formatTime(seconds);
  }
}
