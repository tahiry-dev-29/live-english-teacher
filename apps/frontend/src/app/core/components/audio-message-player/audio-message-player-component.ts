import { Component, input, output, signal, effect } from '@angular/core';

@Component({
  selector: 'app-audio-message-player',
  standalone: true,
  template: `
    <div class="audio-player bg-gray-800/50 rounded-2xl px-4 py-3 flex items-center gap-3 max-w-xs hover:bg-gray-800/70 transition-colors">
      
      <!-- Play/Pause Button -->
      <button 
        (click)="togglePlay()"
        class="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 transition-all flex items-center justify-center flex-shrink-0"
        [attr.aria-label]="isPlaying() ? 'Pause' : 'Play'">
        @if (isPlaying()) {
          <!-- Pause Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-white">
            <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />
          </svg>
        } @else {
          <!-- Play Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-white ml-0.5">
            <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
          </svg>
        }
      </button>

      <!-- Waveform Progress -->
      <div class="flex-1 flex flex-col gap-1">
        <!-- Waveform Bars -->
        <div 
          class="flex items-center gap-0.5 h-8 cursor-pointer"
          (click)="seekToPosition($event)"
          #waveformContainer>
          @for (bar of waveformBars(); track $index) {
            <div 
              class="waveform-bar rounded-full transition-all"
              [style.height.px]="bar"
              [style.width.px]="2"
              [class.bg-blue-500]="$index < currentBarIndex()"
              [class.bg-gray-600]="$index >= currentBarIndex()">
            </div>
          }
        </div>
        
        <!-- Time Display -->
        <div class="flex justify-between text-xs text-gray-400">
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
      background-color: rgb(59, 130, 246) !important;
    }
  `
})
export class AudioMessagePlayerComponent {
  // Inputs
  audioData = input.required<string>(); // Base64 audio data
  mimeType = input<string>('audio/webm');
  
  // Outputs
  playbackStarted = output<void>();
  playbackEnded = output<void>();

  // Internal state
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  waveformBars = signal<number[]>([]);
  currentBarIndex = signal(0);
  
  private audioElement: HTMLAudioElement | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    // Generate random waveform
    this.waveformBars.set(
      Array.from({ length: 50 }, () => Math.random() * 24 + 8)
    );

    // Initialize audio when audioData changes
    effect(() => {
      const data = this.audioData();
      if (data) {
        this.initializeAudio(data);
      }
    });
  }

  private initializeAudio(base64Data: string) {
    // Clean up existing audio
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    // Create new audio element
    this.audioElement = new Audio();
    const blob = this.base64ToBlob(base64Data, this.mimeType());
    this.audioElement.src = URL.createObjectURL(blob);

    // Set up event listeners
    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement) {
        this.duration.set(this.audioElement.duration);
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.currentTime.set(0);
      this.currentBarIndex.set(0);
      this.playbackEnded.emit();
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
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
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
    } else {
      this.audioElement.play();
      this.isPlaying.set(true);
      this.playbackStarted.emit();
      this.updateProgress();
    }
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
