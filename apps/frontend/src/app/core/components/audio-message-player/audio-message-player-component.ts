import {
  Component,
  OnDestroy,
  input,
  output,
  signal,
  effect,
} from '@angular/core';

@Component({
  selector: 'app-audio-message-player',
  standalone: true,
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-5 h-5"
        >
          <path
            fill-rule="evenodd"
            d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
            clip-rule="evenodd"
          />
        </svg>
        } @else {
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-5 h-5 ml-0.5"
        >
          <path
            fill-rule="evenodd"
            d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
            clip-rule="evenodd"
          />
        </svg>
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
            class="waveform-bar rounded-full transition-all"
            [style.height.px]="bar"
            [style.width.px]="2"
            [class.bg-primary]="$index < currentBarIndex()"
            [class.bg-base-300]="$index >= currentBarIndex()"
          ></div>
          }
        </div>
        <div class="flex justify-between text-xs text-base-content/60">
          <span>{{ formatTime(currentTime()) }}</span>
          <span>{{ formatTime(duration()) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    .waveform-bar {
      transition: background-color 0.2s ease, height 0.1s ease;
    }
    .waveform-bar:hover {
      background-color: var(--color-primary) !important;
    }
  `,
})
export class AudioMessagePlayerComponent implements OnDestroy {
  audioData = input.required<string>();
  mimeType = input<string>('audio/webm');

  playbackStarted = output<void>();
  playbackEnded = output<void>();

  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  waveformBars = signal<number[]>([]);
  currentBarIndex = signal(0);

  private audioElement: HTMLAudioElement | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.waveformBars.set(
      Array.from({ length: 50 }, () => Math.random() * 24 + 8)
    );
    effect(() => {
      const data = this.audioData();
      if (data) {
        this.initializeAudio(data);
      }
    });
  }

  private initializeAudio(data: string) {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    this.audioElement = new Audio();
    const blob = this.base64ToBlob(data, this.mimeType());
    this.audioElement.src = URL.createObjectURL(blob);
    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement) this.duration.set(this.audioElement.duration);
    });
    this.audioElement.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.currentTime.set(0);
      this.currentBarIndex.set(0);
      this.playbackEnded.emit();
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    });
    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement) {
        this.currentTime.set(this.audioElement.currentTime);
        this.updateBarIndex();
      }
    });
  }

  togglePlay() {
    if (!this.audioElement) return;
    if (this.isPlaying()) {
      this.audioElement.pause();
      this.isPlaying.set(false);
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    } else {
      this.audioElement.play();
      this.isPlaying.set(true);
      this.playbackStarted.emit();
      this.updateProgress();
    }
  }

  seekBy(deltaSeconds: number) {
    if (!this.audioElement || !this.duration()) return;
    const newTime = Math.min(
      Math.max(0, this.audioElement.currentTime + deltaSeconds),
      this.duration()
    );
    this.audioElement.currentTime = newTime;
    this.currentTime.set(newTime);
    this.updateBarIndex();
  }

  seekToPosition(event: MouseEvent) {
    if (!this.audioElement) return;
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    this.audioElement.currentTime = percentage * this.duration();
    this.currentTime.set(this.audioElement.currentTime);
    this.updateBarIndex();
  }

  private updateProgress() {
    if (!this.isPlaying()) return;
    this.updateBarIndex();
    this.animationFrameId = requestAnimationFrame(() => this.updateProgress());
  }

  private updateBarIndex() {
    const progress = this.currentTime() / this.duration();
    const barCount = this.waveformBars().length;
    this.currentBarIndex.set(Math.floor(progress * barCount));
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  ngOnDestroy() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
