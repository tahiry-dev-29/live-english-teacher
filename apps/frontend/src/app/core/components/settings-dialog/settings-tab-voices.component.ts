import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  output,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideSquare, LucidePlay } from '@lucide/angular';
import {
  ElevenLabsVoiceService,
  TtsVoice,
} from '@core/services/elevenlabs-voice.service';
import { I18nService } from '@core/services/i18n.service';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-settings-tab-voices',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideSquare, LucidePlay],
  template: `
    <fieldset class="fieldset">
      <legend
        class="fieldset-legend flex w-full items-center justify-between text-sm font-semibold"
      >
        <span>{{ t('voices.title') }}</span>
        <span class="badge badge-outline text-xs badge-primary">{{
          t('voices.hd')
        }}</span>
      </legend>
      <div
        class="max-h-[50vh] space-y-1.5 overflow-y-auto rounded-box border border-base-300 bg-base-100/50 p-2"
      >
        @for (voice of availableVoicesList(); track voice.id) {
          <div
            class="flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-2.5 transition-all"
            [class.bg-primary/20]="elevenLabs.selectedVoiceId() === voice.id"
            [class.border-primary/50]="
              elevenLabs.selectedVoiceId() === voice.id
            "
            [class.hover:bg-base-300/60]="
              elevenLabs.selectedVoiceId() !== voice.id
            "
            (click)="onSelectVoice(voice.id)"
            (keyup.enter)="onSelectVoice(voice.id)"
            tabindex="0"
            role="button"
          >
            <div class="min-w-0 flex-1 pr-2">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-semibold">{{ voice.name }}</p>
                @if (elevenLabs.selectedVoiceId() === voice.id) {
                  <span class="badge badge-xs badge-primary">{{
                    t('voices.selected')
                  }}</span>
                }
              </div>
              @if (voice.description) {
                <p class="truncate text-xs text-base-content/60">
                  {{ voice.description }}
                </p>
              }
            </div>
            <button
              type="button"
              class="btn btn-circle shrink-0 btn-sm"
              [class.btn-primary]="playingVoiceId() === voice.id"
              [class.btn-ghost]="playingVoiceId() !== voice.id"
              (click)="previewVoice(voice); $event.stopPropagation()"
              [attr.aria-label]="
                playingVoiceId() === voice.id ? 'Stop' : 'Preview'
              "
            >
              @if (playingVoiceId() === voice.id) {
                <svg lucideSquare class="h-4 w-4"></svg>
              } @else {
                <svg lucidePlay class="h-4 w-4"></svg>
              }
            </button>
          </div>
        }
      </div>
    </fieldset>
  `,
})
export class SettingsTabVoicesComponent {
  readonly elevenLabs = inject(ElevenLabsVoiceService);
  readonly i18n = inject(I18nService);
  readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly voiceChange = output<string>();

  readonly playingVoiceId = signal<string | null>(null);
  private audioPreview: HTMLAudioElement | null = null;

  readonly availableVoicesList = computed<TtsVoice[]>(() =>
    this.elevenLabs.voices(),
  );

  private readonly sampleTexts: Record<string, string> = {
    en: 'Hello! I am your AI English tutor. How can I help you improve today?',
    fr: "Bonjour ! Je suis votre tuteur IA. Comment puis-je vous aider aujourd'hui ?",
    es: '¡Hola! Soy tu tutor de IA. ¿Cómo puedo ayudarte hoy?',
    de: 'Hallo! Ich bin dein KI-Tutor. Wie kann ich dir heute helfen?',
    it: 'Ciao! Sono il tuo tutor AI. Come posso aiutarti oggi?',
    ja: 'こんにちは！あなたのAIチューターです。よろしくお願いします！',
  };

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopAudioPreview();
    });
  }

  t(key: string): string {
    return this.i18n.t()(key);
  }

  onSelectVoice(voiceId: string): void {
    this.elevenLabs.setVoiceId(voiceId);
    this.voiceChange.emit(voiceId);
  }

  async previewVoice(voice: TtsVoice): Promise<void> {
    if (this.playingVoiceId() === voice.id) {
      this.stopAudioPreview();
      return;
    }

    this.stopAudioPreview();
    this.playingVoiceId.set(voice.id);

    const langCode = this.languageService.selectedLanguageCode();
    const text = this.sampleTexts[langCode] ?? this.sampleTexts['en'];

    try {
      const audioResult = await this.elevenLabs.generateSpeechAudio(
        text,
        voice.id,
        langCode,
      );
      if (audioResult) {
        const byteCharacters = atob(audioResult.audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], {
          type: audioResult.mimeType,
        });
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

  stopAudioPreview(): void {
    if (this.audioPreview) {
      this.audioPreview.pause();
      this.audioPreview = null;
    }
    this.playingVoiceId.set(null);
  }
}
