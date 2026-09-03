import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Language {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
    <div
      class="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        class="modal-box max-w-lg bg-base-200 p-0 overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div
          class="flex items-center justify-between p-5 border-b border-base-300 shrink-0"
        >
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-primary/15 rounded-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5 text-primary"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h2
              id="settings-title"
              class="text-lg font-semibold text-base-content"
            >
              Settings
            </h2>
          </div>
          <button
            type="button"
            (click)="handleCancel()"
            class="btn btn-ghost btn-circle btn-sm"
            aria-label="Close settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="p-5 space-y-6 overflow-y-auto flex-1">
          <div class="space-y-3">
            <label
              for="language"
              class="flex items-center gap-2 text-sm font-medium text-base-content/70"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-4 h-4 text-primary"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
              Learning Language
            </label>
            <div class="grid grid-cols-3 gap-2">
              @for (lang of languagesList; track lang.code) {
              <button
                type="button"
                (click)="tempLanguage.set(lang.code)"
                class="btn justify-start gap-2"
                [class.btn-primary]="tempLanguage() === lang.code"
                [class.btn-ghost]="tempLanguage() !== lang.code"
              >
                <span class="text-base">{{ lang.flag }}</span>
                <span>{{ lang.name }}</span>
              </button>
              }
            </div>
          </div>

          <div class="space-y-3">
            <label
              for="voice"
              class="flex items-center gap-2 text-sm font-medium text-base-content/70"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-4 h-4 text-secondary"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                />
              </svg>
              AI Voice
              <span class="text-xs text-base-content/50 ml-auto"
                >{{ filteredVoices().length }} voices available</span
              >
            </label>
            <div class="space-y-2 max-h-52 overflow-y-auto pr-1" role="listbox">
              @for (voice of filteredVoices(); track voice.name) {
              <div
                role="option"
                [attr.aria-selected]="tempVoiceName() === voice.name"
                class="flex items-center gap-3 p-3 rounded-box transition-all cursor-pointer border text-left"
                [class]="
                  tempVoiceName() === voice.name
                    ? 'bg-primary/20 border-primary text-base-content'
                    : 'bg-base-300/40 border-base-300 hover:bg-base-300'
                "
                tabindex="0"
                (keydown.space)="$event.preventDefault()"
                (keyup.enter)="
                  tempVoiceName.set(voice.name); $event.stopPropagation()
                "
                (keyup.space)="
                  tempVoiceName.set(voice.name); $event.stopPropagation()
                "
                (click)="tempVoiceName.set(voice.name)"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-base-content truncate">
                    {{ voice.name }}
                  </div>
                  <div class="text-xs text-base-content/50 truncate">
                    {{ voice.lang }}
                  </div>
                </div>
                <button
                  type="button"
                  (click)="previewVoice(voice); $event.stopPropagation()"
                  class="btn btn-circle btn-ghost btn-sm shrink-0"
                  [class.btn-primary]="playingVoice() === voice.name"
                  [attr.aria-label]="
                    playingVoice() === voice.name
                      ? 'Stop preview'
                      : 'Preview voice'
                  "
                >
                  @if (playingVoice() === voice.name) {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="w-4 h-4 animate-pulse"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
                    />
                  </svg>
                  } @else {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                    />
                  </svg>
                  }
                </button>
                @if (tempVoiceName() === voice.name) {
                <span class="badge badge-primary badge-sm shrink-0">✓</span>
                }
              </div>
              } @empty {
              <div class="text-center py-8 text-base-content/50 text-sm">
                No voices available for this language
              </div>
              }
            </div>
          </div>
        </div>

        <div
          class="p-5 border-t border-base-300 bg-base-200 shrink-0 flex gap-3"
        >
          <button
            type="button"
            (click)="handleCancel()"
            class="btn btn-ghost flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="handleSave()"
            class="btn btn-primary flex-1"
          >
            Save
          </button>
        </div>
      </div>
      <button
        type="button"
        class="modal-backdrop cursor-default"
        (click)="handleCancel()"
        aria-label="Close dialog"
      ></button>
    </div>
    }
  `,
})
export class SettingsDialogComponent {
  isOpen = input(false);
  languages = input<{ code: string; name: string }[]>([]);
  voices = input<SpeechSynthesisVoice[]>([]);
  selectedLanguage = input('en');
  selectedVoiceName = input('');
  closed = output<void>();
  languageChange = output<string>();
  voiceChange = output<string>();
  tempLanguage = signal('en');
  tempVoiceName = signal('');
  playingVoice = signal<string | null>(null);
  languagesList: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  ];
  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.tempLanguage.set(this.selectedLanguage());
        this.tempVoiceName.set(this.selectedVoiceName());
      }
    });
  }
  filteredVoices = computed(() => {
    const lang = this.tempLanguage();
    return this.voices().filter((v) =>
      v.lang.toLowerCase().startsWith(lang.toLowerCase())
    );
  });
  private sampleTexts: Record<string, string> = {
    en: 'Hello! This is a sample of my voice. Nice to meet you!',
    fr: 'Bonjour! Ceci est un exemple de ma voix. Enchanté!',
    es: '¡Hola! Este es un ejemplo de mi voz. ¡Mucho gusto!',
    de: 'Hallo! Dies ist ein Beispiel meiner Stimme. Freut mich!',
    it: 'Ciao! Questo è un esempio della mia voce. Piacere!',
    ja: 'こんにちは！これは私の声のサンプルです。よろしくお願いします！',
  };
  handleSave() {
    window.speechSynthesis.cancel();
    this.playingVoice.set(null);
    this.languageChange.emit(this.tempLanguage());
    this.voiceChange.emit(this.tempVoiceName());
    this.closed.emit();
  }
  handleCancel() {
    window.speechSynthesis.cancel();
    this.playingVoice.set(null);
    this.tempLanguage.set(this.selectedLanguage());
    this.tempVoiceName.set(this.selectedVoiceName());
    this.closed.emit();
  }
  previewVoice(voice: SpeechSynthesisVoice) {
    if (this.playingVoice() === voice.name) {
      window.speechSynthesis.cancel();
      this.playingVoice.set(null);
      return;
    }
    window.speechSynthesis.cancel();
    const langCode = voice.lang.split('-')[0].toLowerCase();
    const text = this.sampleTexts[langCode] || this.sampleTexts['en'];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => this.playingVoice.set(voice.name);
    utterance.onend = () => this.playingVoice.set(null);
    utterance.onerror = () => this.playingVoice.set(null);
    window.speechSynthesis.speak(utterance);
  }
}
