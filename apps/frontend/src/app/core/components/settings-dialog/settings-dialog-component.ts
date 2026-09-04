import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideX, LucideSquare, LucideMic } from '@lucide/angular';
import { FormsModule } from '@angular/forms';

interface Language {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX, LucideSquare, LucideMic],
  template: `
    <!-- daisyUI 5: dialog element with showModal() -->
    <dialog #dialogEl class="modal">
      <div class="modal-box max-w-lg p-0 max-h-[90vh] flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-300 shrink-0">
          <h3 class="font-bold text-lg">Settings</h3>
          <form method="dialog">
            <button
              class="btn btn-sm btn-circle btn-ghost"
              (click)="handleCancel()"
              aria-label="Close"
            >
              <svg lucideX class="w-4 h-4"></svg>
            </button>
          </form>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6 overflow-y-auto flex-1">

          <!-- Language fieldset -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Learning Language</legend>
            <div class="grid grid-cols-3 gap-2">
              @for (lang of languagesList; track lang.code) {
                <button
                  type="button"
                  class="btn btn-outline justify-start gap-2 h-auto py-3 px-3"
                  [class.btn-primary]="tempLanguage() === lang.code"
                  (click)="onLanguageSelect(lang.code)"
                >
                  <span class="text-xl leading-none">{{ lang.flag }}</span>
                  <span class="text-xs font-medium">{{ lang.name }}</span>
                </button>
              }
            </div>
          </fieldset>

          <!-- Voice fieldset -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">AI Tutor Voice</legend>
            <div class="space-y-1 max-h-48 overflow-y-auto rounded-box border border-base-300 p-1">
              @for (voice of filteredVoices(); track voice.name) {
                <div
                  class="flex items-center gap-2 p-2 rounded-box cursor-pointer transition-colors"
                  [class.bg-primary]="tempVoiceName() === voice.name"
                  [class.text-primary-content]="tempVoiceName() === voice.name"
                  [class.hover:bg-base-200]="tempVoiceName() !== voice.name"
                  (click)="tempVoiceName.set(voice.name)"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{{ voice.name }}</p>
                    <p class="text-xs opacity-60 truncate">{{ voice.lang }}</p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-circle shrink-0"
                    (click)="previewVoice(voice); $event.stopPropagation()"
                    [attr.aria-label]="playingVoice() === voice.name ? 'Stop' : 'Preview'"
                  >
                    @if (playingVoice() === voice.name) {
                      <svg lucideSquare class="w-3.5 h-3.5"></svg>
                    } @else {
                      <svg lucideMic class="w-3.5 h-3.5"></svg>
                    }
                  </button>
                  @if (tempVoiceName() === voice.name) {
                    <span class="badge badge-primary badge-sm shrink-0">✓</span>
                  }
                </div>
              } @empty {
                <div class="text-center py-8 text-sm text-base-content/50">
                  No voices available for this language
                </div>
              }
            </div>
          </fieldset>

        </div>

        <!-- Footer actions -->
        <div class="modal-action px-6 py-4 border-t border-base-300 shrink-0">
          <form method="dialog" class="flex gap-2">
            <button type="submit" class="btn btn-ghost" (click)="handleCancel()">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" (click)="handleSave()">
              Save
            </button>
          </form>
        </div>
      </div>

      <!-- Backdrop closes dialog -->
      <form method="dialog" class="modal-backdrop">
        <button (click)="handleCancel()">close</button>
      </form>
    </dialog>
  `,
})
export class SettingsDialogComponent {
  readonly dialogEl = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');

  isOpen = input<boolean>(false);
  languages = input<Language[]>([]);
  voices = input<SpeechSynthesisVoice[]>([]);
  selectedLanguage = input<string>('en');
  selectedVoiceName = input<string>('');

  closed = output<void>();
  languageChange = output<string>();
  voiceChange = output<string>();

  tempLanguage = signal<string>('en');
  tempVoiceName = signal<string>('');
  playingVoice = signal<string | null>(null);

  private readonly defaultLanguages: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
  ];

  get languagesList(): Language[] {
    const langs = this.languages();
    return langs.length > 0 ? langs : this.defaultLanguages;
  }

  filteredVoices = computed(() => {
    const lang = this.tempLanguage();
    return this.voices().filter((v) =>
      v.lang.toLowerCase().startsWith(lang.toLowerCase())
    );
  });

  private readonly sampleTexts: Record<string, string> = {
    en: 'Hello! This is a sample of my voice. Nice to meet you!',
    fr: 'Bonjour! Ceci est un exemple de ma voix. Enchanté!',
    es: '¡Hola! Este es un ejemplo de mi voz. ¡Mucho gusto!',
    de: 'Hallo! Dies ist ein Beispiel meiner Stimme. Freut mich!',
    it: 'Ciao! Questo è un esempio della mia voce. Piacere!',
    ja: 'こんにちは！これは私の声のサンプルです。よろしくお願いします！',
  };

  constructor() {
    // Open/close the native dialog based on isOpen() signal
    effect(() => {
      const dialog = this.dialogEl()?.nativeElement;
      if (!dialog) return;
      if (this.isOpen()) {
        this.tempLanguage.set(this.selectedLanguage());
        this.tempVoiceName.set(this.selectedVoiceName());
        if (!dialog.open) dialog.showModal();
      } else {
        if (dialog.open) dialog.close();
      }
    });
  }

  onLanguageSelect(code: string): void {
    this.tempLanguage.set(code);
    const first = this.filteredVoices()[0];
    this.tempVoiceName.set(first?.name ?? '');
  }

  previewVoice(voice: SpeechSynthesisVoice): void {
    if (this.playingVoice() === voice.name) {
      window.speechSynthesis.cancel();
      this.playingVoice.set(null);
      return;
    }
    window.speechSynthesis.cancel();
    const langCode = voice.lang.split('-')[0].toLowerCase();
    const text = this.sampleTexts[langCode] ?? this.sampleTexts['en'];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => this.playingVoice.set(voice.name);
    utterance.onend = () => this.playingVoice.set(null);
    utterance.onerror = () => this.playingVoice.set(null);
    window.speechSynthesis.speak(utterance);
  }

  handleSave(): void {
    window.speechSynthesis.cancel();
    this.playingVoice.set(null);
    this.languageChange.emit(this.tempLanguage());
    this.voiceChange.emit(this.tempVoiceName());
    this.closed.emit();
  }

  handleCancel(): void {
    window.speechSynthesis.cancel();
    this.playingVoice.set(null);
    this.tempLanguage.set(this.selectedLanguage());
    this.tempVoiceName.set(this.selectedVoiceName());
    this.closed.emit();
  }
}
