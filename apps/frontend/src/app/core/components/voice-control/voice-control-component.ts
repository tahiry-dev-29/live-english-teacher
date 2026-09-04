import { Component, input, output, signal, effect } from '@angular/core';
import { LucidePlay, LucidePause, LucideSquare } from '@lucide/angular';

@Component({
  selector: 'app-voice-control',
  standalone: true,
  imports: [LucidePlay, LucidePause, LucideSquare],
  template: `
    <div class="voice-control-whatsapp bg-green-100/10 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg border border-green-500/20 max-w-md">
      
      <!-- Play/Pause Button -->
      <button 
        (click)="togglePlayPause()"
        class="btn btn-circle btn-success shadow-md"
        [attr.aria-label]="isPlaying() ? 'Pause' : 'Play'">
        @if (isPlaying()) {
          <svg lucidePause class="w-5 h-5"></svg>
        } @else {
          <svg lucidePlay class="w-5 h-5 ml-0.5"></svg>
        }
      </button>

      <!-- Waveform & Time -->
      <div class="flex-1 flex flex-col gap-1.5">
        <!-- Time -->
        <div class="text-sm font-medium text-success">
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
            [attr.aria-valuemax]="totalDuration()"
            [attr.aria-valuenow]="currentTime()">
            
            @for (bar of waveformBars(); track $index) {
              <div 
                class="w-1 rounded-full transition-all duration-75"
                [class.bg-success]="isBarPlayed($index)"
                [class.bg-gray-600]="!isBarPlayed($index)"
                [style.height.px]="getBarHeight(bar)">
              </div>
            }
          </div>

          <!-- Progress Bar Overlay (for precision) -->
          <div 
            class="absolute bottom-0 left-0 h-0.5 bg-success rounded-full pointer-events-none transition-all duration-75"
            [style.width.%]="getProgress()">
          </div>
        </div>
      </div>

      <!-- Stop Button -->
      <button 
        (click)="stopPlayback()"
        class="btn btn-circle btn-sm btn-error"
        [attr.aria-label]="'Stop'">
        <svg lucideSquare class="w-4 h-4"></svg>
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
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
})
export class VoiceControlComponent {
  currentTime = input<number>(0);
  totalDuration = input<number>(0);
  
  stopped = output<void>();
  seeked = output<number>();
  paused = output<void>();
  resumed = output<void>();

  isPlaying = signal(true);
  waveformBars = signal<number[]>([]);

  constructor() {
    this.generateWaveform();
  }

  togglePlayPause() {
    this.isPlaying.update(v => !v);
    if (this.isPlaying()) {
      this.resumed.emit();
    } else {
      this.paused.emit();
    }
  }

  stopPlayback() {
    this.isPlaying.set(false);
    this.stopped.emit();
  }

  seekToPosition(event: MouseEvent) {
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * this.totalDuration();
    this.seeked.emit(newTime);
  }

  handleKeydown(event: KeyboardEvent) {
    const step = 5;
    let newTime = this.currentTime();

    if (event.key === 'ArrowRight') {
      newTime = Math.min(this.totalDuration(), newTime + step);
      this.seeked.emit(newTime);
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      newTime = Math.max(0, newTime - step);
      this.seeked.emit(newTime);
      event.preventDefault();
    } else if (event.key === ' ' || event.key === 'Enter') {
      this.togglePlayPause();
      event.preventDefault();
    }
  }

  getProgress(): number {
    if (this.totalDuration() === 0) return 0;
    return (this.currentTime() / this.totalDuration()) * 100;
  }

  isBarPlayed(index: number): boolean {
    const totalBars = this.waveformBars().length;
    if (totalBars === 0) return false;
    const barProgress = (index / totalBars) * 100;
    return barProgress <= this.getProgress();
  }

  getBarHeight(value: number): number {
    return Math.max(4, value * 24);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private generateWaveform() {
    const bars: number[] = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
      const value = 0.2 + Math.sin(i * 0.4) * 0.3 + Math.random() * 0.5;
      bars.push(Math.min(1, Math.max(0.15, value)));
    }
    this.waveformBars.set(bars);
  }
}
