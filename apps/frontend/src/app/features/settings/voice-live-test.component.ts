import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  DestroyRef,
} from '@angular/core';
import { LucidePlay, LucideSquare } from '@lucide/angular';
import type { Subscription } from 'rxjs';
import { base64ToBlob } from '@core/utils/text.util';
import { TtsSynthesisService } from '@features/tts-voice/services/tts-synthesis.service';
import { ElevenLabsVoiceService } from '@features/tts-voice/services/elevenlabs-voice.service';
import { LanguageService } from '@features/settings/services/language.service';
import { sampleTextFor } from './settings-tab-voices.util';

const UNPLAYABLE = new Set(['Polly', 'MiniMax']);

/** Live server-TTS preview (POST /ai/tts) for the selected voice. */
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
  `,
})
export class VoiceLiveTestComponent {
  readonly voiceId = input<string>('');
  private readonly synthesis = inject(TtsSynthesisService);
  private readonly voices = inject(ElevenLabsVoiceService);
  private readonly langs = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly testing = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  private audioEl: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private synthesis$: Subscription | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.synthesis$?.unsubscribe();
      this.stopAll();
    });
  }

  /** Explicit action (Angular 20 rule): the POST runs only on click. */
  test(): void {
    if (this.testing()) {
      this.stopAll();
      return;
    }
    this.error.set(null);
    const lang = this.langs.selectedLanguageCode();
    this.testing.set(true);
    this.synthesis$ = this.synthesis
      .synthesize(sampleTextFor(lang), {
        voiceId: this.voiceId() || undefined,
        lang,
      })
      .subscribe((outcome) => {
        if (!outcome.ok) {
          this.fail(outcome.message);
          return;
        }
        void this.play(outcome);
      });
  }

  private async play(outcome: {
    audioData: string;
    mimeType: string;
  }): Promise<void> {
    try {
      this.release();
      this.objectUrl = URL.createObjectURL(
        base64ToBlob(outcome.audioData, outcome.mimeType),
      );
      const audio = new Audio(this.objectUrl);
      this.audioEl = audio;
      audio.onended = () => this.stopAll();
      audio.onerror = () => this.fail();
      await audio.play();
    } catch {
      this.fail();
    }
  }

  /** Server message wins; provider hint covers playback-side failures. */
  private fail(message?: string): void {
    this.release();
    this.testing.set(false);
    const label = this.voices.currentProviderMeta()?.label ?? 'this provider';
    this.error.set(
      message ??
        (UNPLAYABLE.has(label)
          ? `${label} synthesis is not wired yet — pick another provider.`
          : 'Live audio unavailable. Check key / provider.'),
    );
  }

  private stopAll(): void {
    this.release();
    this.testing.set(false);
  }

  private release(): void {
    this.audioEl?.pause();
    this.audioEl = null;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
