import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { LucidePlay, LucideSquare } from '@lucide/angular';
import { LanguageService } from '@features/settings/services/language.service';
import { BrowserVoiceService } from '@features/tts-voice/services/browser-voice.service';
import { BrowserSpeechService } from '@features/tts-voice/services/browser-speech.service';
import {
  AppSelectComponent,
  SelectOption,
} from '@core/components/ui/select/select.component';
import { sampleTextFor } from './settings-tab-voices.util';

/** Live browser voices (Web Speech). Selection drives real playback. */
@Component({
  selector: 'app-browser-voice-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePlay, LucideSquare, AppSelectComponent],
  template: `
    <div class="space-y-2 border-t border-base-300 pt-4">
      <p class="text-xs font-medium uppercase opacity-50">
        Browser voices ({{ voiceStore.browserVoices().length }}) — live Web
        Speech
      </p>
      @if (!voiceStore.speechSupported()) {
        <p
          class="rounded-lg border border-dashed p-4 text-center text-xs opacity-60"
        >
          Web Speech is not supported in this browser.
        </p>
      } @else if (
        voiceStore.engineChecked() && voiceStore.browserVoices().length === 0
      ) {
        <div
          class="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3"
        >
          <p class="text-xs">
            No speech engine detected (common on Linux Chromium). Use Chrome or
            install a system voice engine.
          </p>
          <button
            type="button"
            class="btn shrink-0 btn-ghost btn-xs"
            (click)="reload()"
          >
            Retry
          </button>
        </div>
      } @else if (voiceStore.browserVoices().length === 0) {
        <p
          class="rounded-lg border border-dashed p-4 text-center text-xs opacity-60"
        >
          Loading browser voices…
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
          [value]="voiceStore.selectedVoiceName()"
          (valueChange)="onSelectVoice($event)"
          size="sm"
          color="primary"
        />
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn gap-1.5 btn-ghost btn-xs"
            (click)="preview()"
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
  readonly voiceStore = inject(BrowserVoiceService);
  private readonly speaker = inject(BrowserSpeechService);
  readonly previewing = signal<boolean>(false);
  readonly browserVoiceOptions = computed<SelectOption[]>(() =>
    this.voiceStore.browserVoices().map((v) => ({
      value: v.name,
      label: `${v.name} (${v.lang})${v.default ? ' — default' : ''}`,
    })),
  );

  constructor() {
    this.voiceStore.ensureVoices();
  }

  onSelectVoice(name: string | null): void {
    this.voiceStore.setSelectedVoiceName(name);
  }

  reload(): void {
    this.voiceStore.ensureVoices();
  }

  preview(): void {
    if (this.previewing()) {
      this.speaker.stop();
      this.previewing.set(false);
      return;
    }
    const name = this.voiceStore.selectedVoiceName();
    if (!name) return;
    this.speaker.speak(sampleTextFor(this.langs.selectedLanguageCode()), {
      voiceName: name,
      onEnd: () => this.previewing.set(false),
      onError: () => this.previewing.set(false),
    });
    this.previewing.set(true);
  }
}
