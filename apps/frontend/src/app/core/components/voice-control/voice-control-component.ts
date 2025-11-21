import { Component, input, output, signal, effect } from '@angular/core';

@Component({
  selector: 'app-voice-control',
  standalone: true,
  template: `
    <div class="voice-control-whatsapp bg-green-100/10 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg border border-green-500/20 max-w-md">
      
      <!-- Play/Pause Button -->
      <button 
        (click)="togglePlayPause()"
        class="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 transition-all flex items-center justify-center flex-shrink-0 shadow-md"
        [attr.aria-label]="isPlaying() ? 'Pause' : 'Play'">
        @if (isPlaying()) {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-white">
            <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />
          </svg>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-white ml-0.5">
            <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
          </svg>
        }
      </button>

      <!-- Waveform & Time -->
      <div class="flex-1 flex flex-col gap-1.5">
        <!-- Time -->
        <div class="text-sm font-medium text-green-700">
          {{ formatTime(currentTime()) }}
        </div>
        
        <!-- Waveform Visualization with Progress Bar -->
        <div class="relative">
          <!-- Waveform -->
          <div 
            class="h-6 flex items-center gap-0.5 cursor-pointer relative"
            (click)="seekToPosition($event)"
            (keydown)="handleKeydown($event)"
            tabindex="0"
            role="slider"
            [attr.aria-label]="'Seek audio position'"
            [attr.aria-valuemin]="0"
            [attr.aria-valuemax]="100"
            [attr.aria-valuenow]="progress()"
            #progressBar>
            @for (bar of waveformBars(); track $index) {
              <div 
                class="flex-1 rounded-full transition-all duration-100"
                [style.height.%]="bar"
                [class.bg-green-500]="$index < currentBarIndex()"
                [class.bg-green-300/40]="$index >= currentBarIndex()">
              </div>
            }
          </div>
          
          <!-- Progress Bar Overlay -->
          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-green-200/30 rounded-full overflow-hidden pointer-events-none">
            <div 
              class="h-full bg-green-500 transition-all duration-100 rounded-full"
              [style.width.%]="progress()">
            </div>
          </div>
        </div>
      </div>

      <!-- Stop Button -->
      <button 
        (click)="stopPlayback()"
        class="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-600 transition-all flex items-center justify-center flex-shrink-0"
        [attr.aria-label]="'Stop'">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-white">
          <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clip-rule="evenodd" />
        </svg>
      </button>

    </div>
  `,
  styles: `
    .voice-control-whatsapp {
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class VoiceControlComponent {
  // Inputs
  isPlaying = input<boolean>(false);
  currentTime = input<number>(0);
  totalDuration = input<number>(0);
  selectedVoice = input<SpeechSynthesisVoice | null>(null);

  // Outputs
  stopped = output<void>();
  paused = output<void>();
  resumed = output<void>();
  seekRequested = output<number>();
  voiceSelected = output<SpeechSynthesisVoice>();

  // Internal state
  waveformBars = signal<number[]>([]);
  progress = signal(0);
  currentBarIndex = signal(0);

  constructor() {
    // Generate waveform (40 bars for WhatsApp-like look)
    this.waveformBars.set(
      Array.from({ length: 40 }, () => Math.random() * 70 + 30)
    );

    // Update progress when currentTime changes
    effect(() => {
      this.updateProgress();
    });
  }

  togglePlayPause() {
    if (this.isPlaying()) {
      this.paused.emit();
    } else {
      this.resumed.emit();
    }
  }

  stopPlayback() {
    this.stopped.emit();
  }

  seekToPosition(event: MouseEvent) {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;

    this.seekRequested.emit(percentage);
  }

  handleKeydown(event: KeyboardEvent) {
    const currentProgress = this.progress();
    
    // Space/Enter: toggle play/pause
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.togglePlayPause();
      return;
    }
    
    // Arrow keys for seeking
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.seekRequested.emit(Math.max(0, currentProgress - 5) / 100);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.seekRequested.emit(Math.min(100, currentProgress + 5) / 100);
    }
  }

  private updateProgress() {
    const current = this.currentTime();
    const total = this.totalDuration();
    if (total > 0) {
      this.progress.set((current / total) * 100);
      const barCount = this.waveformBars().length;
      this.currentBarIndex.set(Math.floor((current / total) * barCount));
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
