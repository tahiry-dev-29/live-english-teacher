import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { LucidePlay, LucideSquare } from '@lucide/angular';
import { LanguageService } from '@core/services/language.service';
import {
  AppSelectComponent,
  SelectOption,
} from '@core/components/ui/select/select.component';
import { sampleTextFor } from './settings-tab-voices.util';

/** Live browser voices via Web Speech API. Never a registry list. */
@Component({
  selector: 'app-browser-voice-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePlay, LucideSquare, AppSelectComponent],
  template: `
    <div class="space-y-2 border-t border-base-300 pt-4">
      <p class="text-xs font-medium uppercase opacity-50">
        Browser voices ({{ browserVoices().length }}) — live Web Speech
      </p>
      @if (browserVoices().length === 0) {
        <p
          class="rounded-lg border border-dashed p-4 text-center text-xs opacity-60"
        >
          No browser voices detected yet — they load automatically.
          <button
            type="button"
            class="ml-1 link link-primary"
            (click)="reload()"
          >
            Reload
          </button>
        </p>
      } @else {
        <app-select
          selectId="settings-browser-voice"
          [options]="browserVoiceOptions()"
          [(value)]="selectedBrowserVoice"
          size="sm"
          color="primary"
        />
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn gap-1.5 btn-ghost btn-xs"
            (click)="preview()"
            [disabled]="previewing()"
          >
            @if (previewing()) {
              <svg lucideSquare class="h-3 w-3"></svg>
              <span>Stop</span>
            } @else {
              <svg lucidePlay class="h-3 w-3"></svg>
              <span>Preview browser voice</span>
            }
          </button>
          <button type="button" class="btn btn-ghost btn-xs" (click)="reload()">
            Reload voices
          </button>
        </div>
      }
    </div>
  `,
})
export class BrowserVoicePickerComponent {
  private readonly langs = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly browserVoices = signal<SpeechSynthesisVoice[]>([]);
  readonly selectedBrowserVoice = signal<string | null>(null);
  readonly previewing = signal<boolean>(false);
  readonly browserVoiceOptions = computed<SelectOption[]>(() =>
    this.browserVoices().map((v) => ({
      value: v.name,
      label: `${v.name} (${v.lang})${v.default ? ' — default' : ''}`,
    })),
  );
  private voicesHandler: (() => void) | null = null;

  constructor() {
    this.load(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const handler = (): void => this.load(false);
      this.voicesHandler = handler;
      window.speechSynthesis.addEventListener('voiceschanged', handler);
    }
    this.destroyRef.onDestroy(() => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      if (this.voicesHandler) {
        window.speechSynthesis.removeEventListener(
          'voiceschanged',
          this.voicesHandler,
        );
      }
    });
  }

  reload(): void {
    this.load(true);
  }

  preview(): void {
    if (this.previewing()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      this.previewing.set(false);
      return;
    }
    const name = this.selectedBrowserVoice();
    const voice = this.browserVoices().find((v) => v.name === name);
    if (!voice) return;
    const lang = this.langs.selectedLanguageCode();
    const utter = new SpeechSynthesisUtterance(sampleTextFor(lang));
    utter.voice = voice;
    utter.lang = voice.lang;
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = (): void => this.previewing.set(false);
    utter.onerror = (): void => this.previewing.set(false);
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      this.previewing.set(true);
    } catch {
      this.previewing.set(false);
    }
  }

  private load(warmup: boolean): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    if (warmup && synth.getVoices().length === 0) {
      try {
        const probe = new SpeechSynthesisUtterance('.');
        probe.volume = 0;
        synth.speak(probe);
      } catch {
        // ignore
      }
      setTimeout(() => this.load(false), 600);
      return;
    }
    const voices = synth.getVoices();
    if (voices.length > 0) {
      this.browserVoices.set([...voices]);
      const current = this.selectedBrowserVoice();
      if (!current || !voices.some((v) => v.name === current)) {
        const def =
          voices.find((v) => v.default) ||
          voices.find((v) => v.lang.startsWith('en'));
        if (def) this.selectedBrowserVoice.set(def.name);
        else {
          const first = voices[0];
          if (first) this.selectedBrowserVoice.set(first.name);
        }
      }
    } else if (warmup) {
      setTimeout(() => this.load(false), 600);
    }
  }
}
