import { Component, input, output, signal, computed, effect, viewChild, ElementRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideX, LucideSquare, LucidePlay, LucideSparkles } from '@lucide/angular';
import { FormsModule } from '@angular/forms';
import { ElevenLabsVoiceService, TtsVoice } from '@core/services/elevenlabs-voice.service';

interface Language {
  code: string;
  name: string;
  flag: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX, LucideSquare, LucidePlay, LucideSparkles],
  template: `
    <!-- daisyUI 5: dialog element with showModal() -->
    <dialog #dialogEl class="modal">
      <div
        class="modal-box max-w-lg p-0 max-h-[90vh] flex flex-col overflow-hidden bg-base-200 text-base-content border border-base-300 shadow-2xl"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-base-300 shrink-0 bg-base-300/40"
        >
          <div class="flex items-center gap-2">
            <svg lucideSparkles class="w-5 h-5 text-primary"></svg>
            <h3 class="font-bold text-lg">Settings & Voices</h3>
          </div>
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
            <legend class="fieldset-legend font-semibold text-sm text-base-content/80">Learning Language</legend>
            <div class="grid grid-cols-3 gap-2">
              @for (lang of languagesList; track lang.code) {
              <button
                type="button"
                class="btn btn-outline justify-start gap-2 h-auto py-2.5 px-3"
                [class.btn-primary]="tempLanguage() === lang.code"
                (click)="onLanguageSelect(lang.code)"
              >
                <span class="text-xl leading-none">{{ lang.flag }}</span>
                <span class="text-xs font-medium">{{ lang.name }}</span>
              </button>
              }
            </div>
          </fieldset>

          <!-- Voice fieldset (ElevenLabs AI Voices + Browser fallback) -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend font-semibold text-sm text-base-content/80 flex items-center justify-between w-full">
              <span>AI Tutor Voices (ElevenLabs / Neural)</span>
              <span class="text-xs badge badge-primary badge-outline">HD Audio</span>
            </legend>

            <div
              class="space-y-1.5 max-h-56 overflow-y-auto rounded-box border border-base-300 p-2 bg-base-100/50"
            >
              @for (voice of availableVoicesList(); track voice.id) {
              <div
                class="flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border border-transparent"
                [class.bg-primary/20]="tempVoiceId() === voice.id"
                [class.border-primary/50]="tempVoiceId() === voice.id"
                [class.hover:bg-base-300/60]="tempVoiceId() !== voice.id"
                (click)="tempVoiceId.set(voice.id)"
                (keyup.enter)="tempVoiceId.set(voice.id)"
                tabindex="0"
                role="button"
              >
                <div class="flex-1 min-w-0 pr-2">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold truncate">{{ voice.name }}</p>
                    @if (tempVoiceId() === voice.id) {
                    <span class="badge badge-primary badge-xs">Selected</span>
                    }
                  </div>
                  @if (voice.description) {
                  <p class="text-xs text-base-content/60 truncate">{{ voice.description }}</p>
                  }
                </div>

                <button
                  type="button"
                  class="btn btn-circle btn-sm shrink-0"
                  [class.btn-primary]="playingVoiceId() === voice.id"
                  [class.btn-ghost]="playingVoiceId() !== voice.id"
                  (click)="previewVoice(voice); $event.stopPropagation()"
                  [attr.aria-label]="
                    playingVoiceId() === voice.id ? 'Stop' : 'Preview'
                  "
                >
                  @if (playingVoiceId() === voice.id) {
                  <svg lucideSquare class="w-4 h-4"></svg>
                  } @else {
                  <svg lucidePlay class="w-4 h-4"></svg>
                  }
                </button>
              </div>
              }
            </div>
          </fieldset>
        </div>

        <!-- Footer actions -->
        <div class="modal-action px-6 py-4 border-t border-base-300 shrink-0 bg-base-300/30">
          <form method="dialog" class="flex gap-2">
            <button
              type="submit"
              class="btn btn-ghost"
              (click)="handleCancel()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              (click)="handleSave()"
            >
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
  private readonly elevenLabs = inject(ElevenLabsVoiceService);

  readonly dialogEl = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');

  readonly isOpen = input<boolean>(false);
  readonly languages = input<Language[]>([]);
  readonly selectedLanguage = input<string>('en');
  readonly selectedVoiceName = input<string>('');

  readonly closed = output<void>();
  readonly languageChange = output<string>();
  readonly voiceChange = output<string>();

  readonly tempLanguage = signal<string>('en');
  readonly tempVoiceId = signal<string>('JBFqnCBsd6RMkjVDRZzb');
  readonly playingVoiceId = signal<string | null>(null);

  private audioPreview: HTMLAudioElement | null = null;

  readonly availableVoicesList = computed<TtsVoice[]>(() => {
    return this.elevenLabs.voices();
  });

  private readonly defaultLanguages: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  ];

  get languagesList(): Language[] {
    const langs = this.languages();
    return langs.length > 0 ? langs : this.defaultLanguages;
  }

  private readonly sampleTexts: Record<string, string> = {
    en: 'Hello! I am your AI English tutor. How can I help you improve today?',
    fr: 'Bonjour ! Je suis votre tuteur IA. Comment puis-je vous aider aujourd’hui ?',
    es: '¡Hola! Soy tu tutor de IA. ¿Cómo puedo ayudarte hoy?',
    de: 'Hallo! Ich bin dein KI-Tutor. Wie kann ich dir heute helfen?',
    it: 'Ciao! Sono il tuo tutor AI. Come posso aiutarti oggi?',
    ja: 'こんにちは！あなたのAIチューターです。よろしくお願いします！',
  };

  constructor() {
    effect(() => {
      const dialog = this.dialogEl()?.nativeElement;
      if (!dialog) return;
      if (this.isOpen()) {
        this.tempLanguage.set(this.selectedLanguage());
        this.tempVoiceId.set(this.elevenLabs.selectedVoiceId());
        if (!dialog.open) dialog.showModal();
      } else {
        this.stopAudioPreview();
        if (dialog.open) dialog.close();
      }
    });
  }

  onLanguageSelect(code: string): void {
    this.tempLanguage.set(code);
  }

  async previewVoice(voice: TtsVoice): Promise<void> {
    if (this.playingVoiceId() === voice.id) {
      this.stopAudioPreview();
      return;
    }

    this.stopAudioPreview();
    this.playingVoiceId.set(voice.id);

    const langCode = this.tempLanguage();
    const text = this.sampleTexts[langCode] ?? this.sampleTexts['en'];

    try {
      const audioResult = await this.elevenLabs.generateSpeechAudio(
        text,
        voice.id,
        langCode
      );

      if (audioResult) {
        const byteCharacters = atob(audioResult.audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: audioResult.mimeType });
        const url = URL.createObjectURL(blob);

        this.audioPreview = new Audio(url);
        this.audioPreview.onended = () => {
          this.playingVoiceId.set(null);
          URL.revokeObjectURL(url);
        };
        this.audioPreview.onerror = () => {
          this.playingVoiceId.set(null);
          URL.revokeObjectURL(url);
        };
        await this.audioPreview.play();
        return;
      }
    } catch (e) {
      console.warn('Voice preview error:', e);
    }

    this.playingVoiceId.set(null);
  }

  private stopAudioPreview(): void {
    if (this.audioPreview) {
      this.audioPreview.pause();
      this.audioPreview = null;
    }
    this.playingVoiceId.set(null);
  }

  handleSave(): void {
    this.stopAudioPreview();
    this.elevenLabs.selectedVoiceId.set(this.tempVoiceId());
    this.languageChange.emit(this.tempLanguage());
    this.voiceChange.emit(this.tempVoiceId());
    this.closed.emit();
  }

  handleCancel(): void {
    this.stopAudioPreview();
    this.tempLanguage.set(this.selectedLanguage());
    this.tempVoiceId.set(this.elevenLabs.selectedVoiceId());
    this.closed.emit();
  }
}
