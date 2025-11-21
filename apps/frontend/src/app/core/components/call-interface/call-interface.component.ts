import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-call-interface',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gray-950 text-white overflow-hidden font-sans">
      
      <!-- Background Effects -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 pointer-events-none"></div>
      
      <!-- Header -->
      <div class="relative z-10 w-full p-6 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span class="text-sm font-medium text-gray-400 tracking-wider uppercase">Live Call</span>
        </div>
        <div class="text-sm font-medium text-gray-500">{{ duration() }}</div>
      </div>

      <!-- Main Visualizer Area -->
      <div class="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-4xl px-4">
        
        <!-- Status Text -->
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
          
          <!-- Real-time Transcript -->
          @if (transcript() && callState() === 'listening') {
            <p class="mt-4 text-lg text-blue-400 italic animate-pulse">
              "{{ transcript() }}"
            </p>
          }
        </div>

        <!-- Waveform Visualizer -->
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

      <!-- Controls -->
      <div class="relative z-10 w-full p-8 md:p-12 flex items-center justify-center gap-6 md:gap-8">
        
        <!-- Mute Button -->
        <button 
          (click)="toggleMuteState()"
          class="p-4 rounded-full bg-gray-800/50 hover:bg-gray-800 border border-gray-700 text-white transition-all transform hover:scale-105 active:scale-95 backdrop-blur-sm group">
          @if (isMuted()) {
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-red-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 group-hover:text-blue-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          }
        </button>

        <!-- End Call Button -->
        <button 
          (click)="onEndCall()"
          class="p-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/30 transition-all transform hover:scale-110 active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
        </button>

        <!-- More Options Button -->
        <button 
          class="p-4 rounded-full bg-gray-800/50 hover:bg-gray-800 border border-gray-700 text-white transition-all transform hover:scale-105 active:scale-95 backdrop-blur-sm group opacity-50 cursor-not-allowed"
          disabled
          title="Coming soon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </button>

      </div>
    </div>
  `
})
export class CallInterfaceComponent {
  callState = input<string>('idle');
  transcript = input<string>('');
  
  endCall = output<void>();
  toggleMute = output<void>();

  isMuted = signal(false);
  duration = signal('00:00');

  loading = input(false);
  isThinking = input(false);
  
  // Visualizer
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
      // Simulate waveform based on state
      const state = this.callState();
      const isActive = state === 'speaking' || state === 'processing';
      const baseHeight = isActive ? 40 : 15;
      const variance = isActive ? 60 : 10;
      const speed = isActive ? 0.2 : 0.05;

      this.bars = this.bars.map((_, i) => {
        // Create a wave effect
        const time = Date.now() * speed;
        const offset = i * 0.5;
        const wave = Math.sin(time * 0.01 + offset) * 0.5 + 0.5;
        
        // Add some randomness
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
    // Fade out edges
    const center = this.bars.length / 2;
    const dist = Math.abs(index - center);
    return Math.max(0.3, 1 - (dist / center) * 0.8);
  }
}
