import { Component, OnDestroy, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideMic, LucideMicOff, LucidePhoneOff, LucideEllipsis } from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-call-interface',
  standalone: true,
  imports: [
    CommonModule,
    LucideMic,
    LucideMicOff,
    LucidePhoneOff,
    LucideEllipsis,
  ],
  template: `
    <div
      class="fixed inset-0 z-50 flex flex-col items-center justify-between bg-base-100 text-base-content overflow-hidden font-sans"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-base-100 to-base-100 pointer-events-none"
      ></div>

      <div class="relative z-10 w-full p-6 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <span
            class="text-sm font-medium text-base-content/60 tracking-wider uppercase"
            >Live Call</span
          >
        </div>
        <div class="text-sm font-medium text-base-content/40">
          {{ duration() }}
        </div>
      </div>

      <div
        class="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-4xl px-4"
      >
        <div class="mb-8 text-center transition-all duration-500">
          <h2
            class="text-3xl md:text-4xl font-light tracking-tight text-base-content/90"
          >
            @if (callState() === 'speaking') { Speaking... } @else if
            (callState() === 'processing') { Thinking... } @else if (callState()
            === 'listening') { Listening... } @else { Ready }
          </h2>
          @if (transcript() && callState() === 'listening') {
          <p class="mt-4 text-lg text-primary italic animate-pulse">
            "{{ transcript() }}"
          </p>
          }
        </div>

        <div
          class="relative h-32 w-full flex items-center justify-center gap-1.5"
        >
          <!-- $index volontaire : tableau de barres de visualiseur dynamique généré à la volée -->
          @for (bar of bars; track $index) {
          <div
            class="w-1.5 md:w-2 rounded-full transition-all duration-75 ease-in-out"
            [class.bg-primary]="callState() === 'listening'"
            [class.bg-secondary]="callState() === 'speaking'"
            [class.bg-warning]="callState() === 'processing'"
            [class.bg-base-300]="callState() === 'idle'"
            [style.height.%]="getBarHeight($index)"
            [style.opacity]="getBarOpacity($index)"
          ></div>
          }
        </div>
      </div>

      <div
        class="relative z-10 w-full p-8 md:p-12 flex items-center justify-center gap-6 md:gap-8"
      >
        <button (click)="toggleMuteState()" class="btn btn-circle btn-ghost">
          @if (isMuted()) {
          <svg lucideMicOff class="w-6 h-6 text-error"></svg>
          } @else {
          <svg lucideMic class="w-6 h-6"></svg>
          }
        </button>

        <button (click)="onEndCall()" class="btn btn-circle btn-error btn-lg">
          <svg lucidePhoneOff class="w-8 h-8"></svg>
        </button>

        <button
          class="btn btn-circle btn-ghost opacity-50 cursor-not-allowed"
          disabled
          title="Coming soon"
        >
          <svg lucideEllipsis class="w-6 h-6"></svg>
        </button>
      </div>
    </div>
  `,
})
export class CallInterfaceComponent implements OnDestroy {
  readonly callState = input<string>('idle');
  readonly transcript = input<string>('');

  readonly endCall = output<void>();
  readonly toggleMute = output<void>();

  readonly isMuted = signal<boolean>(false);
  readonly duration = signal<string>('00:00');

  readonly loading = input<boolean>(false);
  readonly isThinking = input<boolean>(false);

  bars = new Array(20).fill(0);
  private animationFrameId: number | null = null;
  private startTime = Date.now();
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startVisualizer();
    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  toggleMuteState(): void {
    this.isMuted.update((v) => !v);
    this.toggleMute.emit();
  }

  onEndCall(): void {
    this.endCall.emit();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      const diff = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = Math.floor(diff / 60)
        .toString()
        .padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      this.duration.set(`${mins}:${secs}`);
    }, 1000);
  }

  private startVisualizer(): void {
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
        return Math.max(5, (baseHeight + wave * variance) * (1 + random));
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
