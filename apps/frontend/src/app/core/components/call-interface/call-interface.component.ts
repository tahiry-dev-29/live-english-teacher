import { Component, OnDestroy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideMic, LucideMicOff, LucidePhoneOff, LucideEllipsis } from '@lucide/angular';

@Component({
  selector: 'app-call-interface',
  standalone: true,
  imports: [CommonModule, LucideMic, LucideMicOff, LucidePhoneOff, LucideEllipsis],
  template: `
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gray-950 text-white overflow-hidden font-sans">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 pointer-events-none"></div>

      <div class="relative z-10 w-full p-6 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span class="text-sm font-medium text-gray-400 tracking-wider uppercase">Live Call</span>
        </div>
        <div class="text-sm font-medium text-gray-500">{{ duration() }}</div>
      </div>

      <div class="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-4xl px-4">
        <div class="mb-8 text-center transition-all duration-500">
          <h2 class="text-3xl md:text-4xl font-light tracking-tight text-white/90">
            @if (callState() === 'speaking') {
              Speaking...
            } @else if (callState() === 'processing') {
              Thinking...
            } @else if (callState() === 'listening') {
              Listening...
            } @else {
              Ready
            }
          </h2>
          @if (transcript() && callState() === 'listening') {
            <p class="mt-4 text-lg text-blue-400 italic animate-pulse">
              "{{ transcript() }}"
            </p>
          }
        </div>

        <div class="relative h-32 w-full flex items-center justify-center gap-1.5">
          @for (bar of bars; track $index) {
            <div 
              class="w-1.5 md:w-2 rounded-full transition-all duration-75 ease-in-out"
              [class.bg-blue-500]="callState() === 'listening'"
              [class.bg-purple-500]="callState() === 'speaking'"
              [class.bg-amber-500]="callState() === 'processing'"
              [class.bg-gray-600]="callState() === 'idle'"
              [style.height.%]="getBarHeight($index)"
              [style.opacity]="getBarOpacity($index)">
            </div>
          }
        </div>
      </div>

      <div class="relative z-10 w-full p-8 md:p-12 flex items-center justify-center gap-6 md:gap-8">
        <button 
          (click)="toggleMuteState()"
          class="p-4 rounded-full bg-gray-800/50 hover:bg-gray-800 border border-gray-700 text-white transition-all transform hover:scale-105 active:scale-95 backdrop-blur-sm group">
          @if (isMuted()) {
            <svg lucideMicOff class="w-6 h-6 text-red-400"></svg>
          } @else {
            <svg lucideMic class="w-6 h-6 group-hover:text-blue-400"></svg>
          }
        </button>

        <button 
          (click)="onEndCall()"
          class="p-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/30 transition-all transform hover:scale-110 active:scale-95">
          <svg lucidePhoneOff class="w-8 h-8"></svg>
        </button>

        <button 
          class="p-4 rounded-full bg-gray-800/50 hover:bg-gray-800 border border-gray-700 text-white transition-all transform hover:scale-105 active:scale-95 backdrop-blur-sm group opacity-50 cursor-not-allowed"
          disabled
          title="Coming soon">
          <svg lucideEllipsis class="w-6 h-6"></svg>
        </button>
      </div>
    </div>
  `
})
export class CallInterfaceComponent implements OnDestroy {
  callState = input<string>('idle');
  transcript = input<string>('');
  
  endCall = output<void>();
  toggleMute = output<void>();

  isMuted = signal(false);
  duration = signal('00:00');

  loading = input(false);
  isThinking = input(false);
  
  bars = new Array(20).fill(0);
  private animationFrameId: number | null = null;
  private startTime = Date.now();
  private timerInterval: any;

  constructor() {
    this.startVisualizer();
    this.startTimer();
  }

  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  toggleMuteState() {
    this.isMuted.update(v => !v);
    this.toggleMute.emit();
  }

  onEndCall() {
    this.endCall.emit();
  }

  private startTimer() {
    this.timerInterval = setInterval(() => {
      const diff = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = Math.floor(diff / 60).toString().padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      this.duration.set(`${mins}:${secs}`);
    }, 1000);
  }

  private startVisualizer() {
    const animate = () => {
      const state = this.callState();
      const isActive = state === 'speaking' || state === 'processing';
      const baseHeight = isActive ? 40 : 15;
      const variance = isActive ? 60 : 10;
      const speed = isActive ? 0.2 : 0.05;

      this.bars = this.bars.map((_, i) => {
        const time = Date.now() * speed;
        const offset = i * 0.5;
        const wave = Math.sin(time * 0.01 + offset) * 0.5 + 0.5;
        const random = Math.random() * 0.3;
        return Math.max(5, (baseHeight + (wave * variance)) * (1 + random));
      });

      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  getBarHeight(index: number): number {
    return this.bars[index];
  }

  getBarOpacity(index: number): number {
    const center = this.bars.length / 2;
    const dist = Math.abs(index - center);
    return Math.max(0.3, 1 - (dist / center) * 0.8);
  }
}
