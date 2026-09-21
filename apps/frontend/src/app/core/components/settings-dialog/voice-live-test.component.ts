import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  DestroyRef,
} from '@angular/core';
import { LucidePlay, LucideSquare } from '@lucide/angular';
import { base64ToBlob } from '@core/utils/text.util';
import { ElevenLabsVoiceService } from '@core/services/elevenlabs-voice.service';
import { TtsService } from '@core/services/tts.service';
import { LanguageService } from '@core/services/language.service';
import { sampleTextFor, speakWithBrowser } from './settings-tab-voices.util';

@Component({
  selector: 'app-voice-live-test',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePlay, LucideSquare],
  template: `
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="btn flex-1 gap-2 btn-primary btn-sm"
        (click)="test()"
        [disabled]="testing() || !voiceId()"
      >
        @if (testing()) {
          <svg lucideSquare class="h-3.5 w-3.5"></svg> Stop
        } @else {
          <svg lucidePlay class="h-3.5 w-3.5"></svg> Tester la voix
        }
      </button>
    </div>
    @if (error()) {
      <p class="rounded-lg bg-error/10 p-2 text-xs text-error">{{ error() }}</p>
    }
    @if (usingBrowser()) {
      <p class="text-[11px] opacity-60">Playing via Web Speech (browser).</p>
    }
  `,
})
export class VoiceLiveTestComponent {
  readonly voiceId = input<string>('');
  private readonly tts = inject(ElevenLabsVoiceService);
  private readonly speaker = inject(TtsService);
  private readonly langs = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly testing = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly usingBrowser = signal<boolean>(false);
  private audioEl: HTMLAudioElement | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopAll());
  }

  async test(): Promise<void> {
    if (this.testing()) {
      this.stopAll();
      return;
    }
    this.error.set(null);
    this.usingBrowser.set(false);
    const lang = this.langs.selectedLanguageCode();
    const text = sampleTextFor(lang);
    const provider = this.tts.selectedProviderId();
    this.testing.set(true);

    // Browser provider → Web Speech directly (real local test).
    if (provider === 'browser') {
      this.usingBrowser.set(true);
      speakWithBrowser(
        text,
        lang,
        () => this.testing.set(false),
        () => {
          this.testing.set(false);
          this.error.set('Web Speech failed in this browser.');
        },
      );
      return;
    }

    // Real provider → backend audio first, Web Speech fallback.
    try {
      const res = await this.tts.generateSpeechAudio(
        text,
        this.voiceId() || undefined,
        lang,
      );
      if (res) {
        const blob = base64ToBlob(res.audioData, res.mimeType);
        const url = URL.createObjectURL(blob);
        this.audioEl = new Audio(url);
        this.audioEl.onended = () => {
          this.testing.set(false);
          URL.revokeObjectURL(url);
        };
        this.audioEl.onerror = () => {
          this.testing.set(false);
          URL.revokeObjectURL(url);
          this.fallbackBrowser(text, lang);
        };
        await this.audioEl.play();
        return;
      }
      this.fallbackBrowser(text, lang);
    } catch {
      this.fallbackBrowser(text, lang);
    }
  }

  private fallbackBrowser(text: string, lang: string): void {
    // Also drive global TtsService so chat playback state stays in sync.
    this.usingBrowser.set(true);
    speakWithBrowser(
      text,
      lang,
      () => this.testing.set(false),
      () => {
        this.testing.set(false);
        this.error.set('Live audio unavailable. Check key / provider.');
      },
    );
    void this.speaker.speak(text, { lang }).catch(() => {
      // speak() already falls back internally; ignore
    });
  }

  private stopAll(): void {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl = null;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    this.speaker.stop();
    this.testing.set(false);
  }
}
