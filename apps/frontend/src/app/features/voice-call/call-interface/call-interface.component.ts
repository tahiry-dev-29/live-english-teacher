import {
  Component,
  OnDestroy,
  input,
  output,
  signal,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  LucideMic,
  LucideMicOff,
  LucidePhoneOff,
  LucideChevronDown,
} from '@lucide/angular';
import { CallStatusComponent } from './call-status.component';
import {
  barOpacity,
  computeVisualizerBars,
  formatCallDuration,
} from './call-interface.util';

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-call-interface',
  standalone: true,
  imports: [
    LucideMic,
    LucideMicOff,
    LucidePhoneOff,
    LucideChevronDown,
    CallStatusComponent,
  ],
  templateUrl: './call-interface.component.html',
})
export class CallInterfaceComponent implements OnDestroy {
  readonly callState = input<string>('idle');
  readonly transcript = input<string>('');
  readonly languages = input<LanguageOption[]>([]);
  readonly selectedLanguage = input<string>('en');

  readonly endCall = output<void>();
  readonly toggleMute = output<void>();
  readonly languageChange = output<string>();

  readonly isMuted = signal<boolean>(false);
  readonly duration = signal<string>('00:00');
  readonly currentFlag = signal<string>('🇬🇧');
  readonly currentLanguageName = signal<string>('English');

  readonly loading = input<boolean>(false);
  readonly isThinking = input<boolean>(false);

  bars = new Array(20).fill(0);
  private animationFrameId: number | null = null;
  private startTime = Date.now();
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startVisualizer();
    this.startTimer();

    effect(() => {
      const code = this.selectedLanguage();
      const lang = this.languages().find((l) => l.code === code);
      if (lang) {
        this.currentFlag.set(lang.flag);
        this.currentLanguageName.set(lang.name);
      }
    });
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

  onLanguageSelect(code: string): void {
    this.languageChange.emit(code);
    const lang = this.languages().find((l) => l.code === code);
    if (lang) {
      this.currentFlag.set(lang.flag);
      this.currentLanguageName.set(lang.name);
    }
    (document.activeElement as HTMLElement | null)?.blur();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.duration.set(formatCallDuration(this.startTime));
    }, 1000);
  }

  private startVisualizer(): void {
    const animate = () => {
      this.bars = computeVisualizerBars(this.bars.length, this.callState());
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  getBarHeight(index: number): number {
    return this.bars[index];
  }

  getBarOpacity(index: number): number {
    return barOpacity(index, this.bars.length);
  }
}
