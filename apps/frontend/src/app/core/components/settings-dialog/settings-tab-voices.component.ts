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
import { FormsModule } from '@angular/forms';
import {
  LucideSquare,
  LucidePlay,
  LucideKey,
  LucideEye,
  LucideEyeOff,
  LucideExternalLink,
  LucideMic,
} from '@lucide/angular';
import { MESSAGES } from '@core/constants/messages';
import {
  ElevenLabsVoiceService,
  TtsVoice,
  TtsProviderMeta,
} from '@core/services/elevenlabs-voice.service';
import { ApiKeyService } from '@core/services/api-key.service';
import { I18nService } from '@core/services/i18n.service';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-settings-tab-voices',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideSquare,
    LucidePlay,
    LucideKey,
    LucideEye,
    LucideEyeOff,
    LucideExternalLink,
    LucideMic,
  ],
  template: `
    <div class="space-y-6">
      <!-- 1. Provider Selection -->
      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
          {{ t('voices.provider') }}
        </p>
        <div class="space-y-1">
          @for (p of ttsService.providers(); track p.id) {
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors"
              [class.border-primary]="ttsService.selectedProviderId() === p.id"
              [class.bg-primary/5]="ttsService.selectedProviderId() === p.id"
              [class.text-primary]="ttsService.selectedProviderId() === p.id"
              [class.border-base-300]="ttsService.selectedProviderId() !== p.id"
              [class.text-base-content]="ttsService.selectedProviderId() !== p.id"
              (click)="onSelectProvider(p.id)"
            >
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="text-sm font-medium">{{ p.label }}</span>
                @if (p.quotaNote) {
                  <span class="text-xs text-base-content/50">{{ p.quotaNote }}</span>
                }
              </div>
              <div class="flex shrink-0 items-center gap-2">
                @if (p.quality) {
                  <span class="badge badge-ghost badge-xs">{{ p.quality }}</span>
                }
                @if (ttsService.selectedProviderId() === p.id) {
                  <span class="badge badge-xs badge-primary">Active</span>
                }
              </div>
            </button>
          }
        </div>
      </div>

      <!-- 2. API Key for Selected TTS Provider -->
      @if (selectedProviderMeta()?.hasCustomKeys) {
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
              API Key ({{ selectedProviderMeta()?.label }})
            </p>
            <span class="text-xs text-base-content/40">{{ t('ai.custom_keys.optional') }}</span>
          </div>

          <!-- Key mode status -->
          <div class="flex items-center justify-between rounded-lg border border-base-300 bg-base-100/40 px-3 py-2">
            <div class="flex items-center gap-2">
              <svg lucideKey class="h-3.5 w-3.5 text-base-content/40"></svg>
              @if (currentKeyValue()) {
                <span class="text-xs text-base-content/70">Custom key active</span>
                <span class="badge badge-xs badge-success">Custom</span>
              } @else {
                <span class="text-xs text-base-content/70">Using server key</span>
                <span class="badge badge-xs badge-neutral">Server default</span>
              }
            </div>
            @if (selectedProviderMeta()?.consoleUrl) {
              <a
                [href]="selectedProviderMeta()?.consoleUrl"
                target="_blank"
                rel="noopener"
                class="flex link items-center gap-1 text-xs link-primary"
              >
                <span>Get key</span>
                <svg lucideExternalLink class="h-3 w-3"></svg>
              </a>
            }
          </div>

          <div class="join w-full">
            <input
              [type]="showKey() ? 'text' : 'password'"
              class="input-bordered input join-item flex-1 font-mono text-xs input-sm"
              [placeholder]="
                'Enter ' +
                (selectedProviderMeta()?.label || 'TTS') +
                ' API key (leave empty for server key)'
              "
              [ngModel]="currentKeyValue()"
              (ngModelChange)="onKeyChange($event)"
            />
            <button
              type="button"
              class="btn join-item btn-ghost btn-sm"
              (click)="showKey.set(!showKey())"
              aria-label="Toggle key visibility"
            >
              @if (showKey()) {
                <svg lucideEyeOff class="h-4 w-4"></svg>
              } @else {
                <svg lucideEye class="h-4 w-4"></svg>
              }
            </button>
            @if (currentKeyValue()) {
              <button
                type="button"
                class="btn join-item btn-ghost text-error btn-sm"
                (click)="onClearKey()"
                title="Remove custom key and fall back to server key"
              >
                Reset to server key
              </button>
            }
          </div>
        </div>
      }

      <!-- 3. TTS Model (if provider has multiple models) -->
      @if (providerModels().length > 0) {
        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
            {{ t('voices.model') }}
          </p>
          <div class="space-y-1">
            @for (m of providerModels(); track m.id) {
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors"
                [class.border-primary]="ttsService.selectedModelId() === m.id"
                [class.bg-primary/5]="ttsService.selectedModelId() === m.id"
                [class.text-primary]="ttsService.selectedModelId() === m.id"
                [class.border-base-300]="ttsService.selectedModelId() !== m.id"
                [class.text-base-content]="ttsService.selectedModelId() !== m.id"
                (click)="ttsService.setModelId(m.id)"
              >
                <span class="text-sm">{{ m.name }}</span>
                @if (ttsService.selectedModelId() === m.id) {
                  <span class="badge badge-xs badge-primary">Selected</span>
                }
              </button>
            }
          </div>
        </div>
      }

      <!-- 4. Voices Discovery and Preview -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
            {{ t('voices.title') }}
          </p>
        </div>
        <div
          class="max-h-[38vh] space-y-1 overflow-y-auto rounded-lg border border-base-300 bg-base-100/30 p-2"
        >
          @if (ttsService.loading()) {
            <div class="py-6 text-center text-xs text-base-content/60">
              <span
                class="loading mb-2 loading-sm loading-spinner text-primary"
              ></span>
              <p>Loading voices...</p>
            </div>
          } @else {
            @for (voice of availableVoicesList(); track voice.id) {
              <div
                class="flex cursor-pointer items-center justify-between rounded-lg border border-transparent px-3 py-2 transition-colors"
                [class.bg-primary/10]="ttsService.selectedVoiceId() === voice.id"
                [class.border-primary/30]="ttsService.selectedVoiceId() === voice.id"
                (click)="onSelectVoice(voice.id)"
                (keyup.enter)="onSelectVoice(voice.id)"
                tabindex="0"
                role="button"
              >
                <div class="min-w-0 flex-1 pr-2">
                  <div class="flex items-center gap-2">
                    <p class="truncate text-sm font-medium">{{ voice.name }}</p>
                    @if (ttsService.selectedVoiceId() === voice.id) {
                      <span class="badge badge-xs badge-primary">{{
                        t('voices.selected')
                      }}</span>
                    }
                  </div>
                  @if (voice.description) {
                    <p class="truncate text-xs text-base-content/50">
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
                  [attr.aria-label]="playingVoiceId() === voice.id ? 'Stop preview' : 'Preview voice'"
                >
                  @if (playingVoiceId() === voice.id) {
                    <svg lucideSquare class="h-4 w-4"></svg>
                  } @else {
                    <svg lucidePlay class="h-4 w-4"></svg>
                  }
                </button>
              </div>
            }
          }
        </div>
      </div>

      <!-- 5. STT (Speech-to-Text) Model -->
      <div class="space-y-2 border-t border-base-300 pt-4">
        <div class="flex items-center gap-2">
          <svg lucideMic class="h-4 w-4 text-base-content/50"></svg>
          <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
            {{ t('voices.stt_model') }}
          </p>
        </div>
        <div class="space-y-1">
          @for (stt of sttModels; track stt.id) {
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors"
              [class.border-primary]="ttsService.selectedSttModel() === stt.id"
              [class.bg-primary/5]="ttsService.selectedSttModel() === stt.id"
              [class.text-primary]="ttsService.selectedSttModel() === stt.id"
              [class.border-base-300]="ttsService.selectedSttModel() !== stt.id"
              [class.text-base-content]="ttsService.selectedSttModel() !== stt.id"
              (click)="ttsService.setSttModel(stt.id)"
            >
              <span class="text-sm">{{ stt.name }}</span>
              @if (ttsService.selectedSttModel() === stt.id) {
                <span class="badge badge-xs badge-primary">Active</span>
              }
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class SettingsTabVoicesComponent {
  readonly ttsService = inject(ElevenLabsVoiceService);
  readonly apiKeyService = inject(ApiKeyService);
  readonly i18n = inject(I18nService);
  readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly voiceChange = output<string>();
  readonly showKey = signal<boolean>(false);
  readonly playingVoiceId = signal<string | null>(null);
  private audioPreview: HTMLAudioElement | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly selectedProviderMeta = computed<TtsProviderMeta | undefined>(() =>
    this.ttsService.currentProviderMeta(),
  );

  readonly providerModels = computed(() => {
    return this.selectedProviderMeta()?.models || [];
  });

  readonly currentKeyValue = computed<string>(() =>
    this.apiKeyService.getKey(this.ttsService.selectedProviderId()),
  );

  readonly availableVoicesList = computed<TtsVoice[]>(() =>
    this.ttsService.voices(),
  );

  readonly sttModels = [
    { id: 'whisper-large-v3-turbo', name: 'Whisper Large V3 Turbo (Fast)' },
    { id: 'whisper-large-v3', name: 'Whisper Large V3 (Accurate)' },
    { id: 'distil-whisper-large-v3-en', name: 'Distil Whisper Large (EN)' },
  ];

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
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
    });
  }

  t(key: string): string {
    return this.i18n.t()(key);
  }

  onSelectProvider(providerId: string): void {
    this.ttsService.setProviderId(providerId);
    this.voiceChange.emit(this.ttsService.selectedVoiceId());
  }

  onKeyChange(value: string): void {
    const provider = this.ttsService.selectedProviderId();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.apiKeyService.setKey(provider, value);
      void this.ttsService.loadVoicesForProvider(provider);
    }, 500);
  }

  onClearKey(): void {
    const provider = this.ttsService.selectedProviderId();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.apiKeyService.clearKey(provider);
    void this.ttsService.loadVoicesForProvider(provider);
  }

  onSelectVoice(voiceId: string): void {
    this.ttsService.setVoiceId(voiceId);
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
      const audioResult = await this.ttsService.generateSpeechAudio(
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
      console.warn(MESSAGES.log.voicePreviewFailed, e);
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
