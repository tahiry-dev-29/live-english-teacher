import {
  Component,
  OnDestroy,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideMic,
  LucideMicOff,
  LucidePhoneOff,
  LucideEllipsis,
} from '@lucide/angular';

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
      class="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-base-100 font-sans text-base-content"
    >
      <div class="pointer-events-none absolute inset-0 bg-primary/10"></div>

      <div class="relative z-10 flex w-full items-center justify-between p-6">
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 animate-pulse rounded-full bg-success"></div>
          <span
            class="text-sm font-medium tracking-wider text-base-content/60 uppercase"
            >Live Call</span
          >
        </div>
        <div class="text-sm font-medium text-base-content/40">
          {{ duration() }}
        </div>
      </div>

      <div
        class="relative z-10 flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4"
      >
        <div class="mb-8 text-center transition-all duration-500">
          <h2
            class="text-3xl font-light tracking-tight text-base-content/90 md:text-4xl"
          >
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
            <p class="mt-4 animate-pulse text-lg text-primary italic">
              "{{ transcript() }}"
            </p>
          }
        </div>

        <div
          class="relative flex h-32 w-full items-center justify-center gap-1.5"
        >
          <!-- $index volontaire : tableau de barres de visualiseur dynamique généré à la volée -->
          @for (bar of bars; track $index) {
            <div
              class="w-1.5 rounded-full transition-all duration-75 ease-in-out md:w-2"
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
        class="relative z-10 flex w-full items-center justify-center gap-6 p-8 md:gap-8 md:p-12"
      >
        <button (click)="toggleMuteState()" class="btn btn-circle btn-ghost">
          @if (isMuted()) {
            <svg lucideMicOff class="h-6 w-6 text-error"></svg>
          } @else {
            <svg lucideMic class="h-6 w-6"></svg>
          }
        </button>

        <button (click)="onEndCall()" class="btn btn-circle btn-error btn-lg">
          <svg lucidePhoneOff class="h-8 w-8"></svg>
        </button>

        <button
          class="btn btn-circle cursor-not-allowed btn-ghost opacity-50"
          disabled
          title="Coming soon"
        >
          <svg lucideEllipsis class="h-6 w-6"></svg>
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
