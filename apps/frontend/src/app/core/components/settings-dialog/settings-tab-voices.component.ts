import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  output,
  DestroyRef,
} from '@angular/core';
import {
  LucideSquare,
  LucidePlay,
  LucideEye,
  LucideEyeOff,
  LucideExternalLink,
} from '@lucide/angular';
import { MESSAGES } from '@core/constants/messages';
import { base64ToBlob } from '@core/utils/text.util';
import {
  ElevenLabsVoiceService,
  TtsVoice,
  TtsProviderMeta,
} from '@core/services/elevenlabs-voice.service';
import { ApiKeyService } from '@core/services/api-key.service';
import { I18nService } from '@core/services/i18n.service';
import { LanguageService } from '@core/services/language.service';
import {
  AppSelectComponent,
  SelectOption,
} from '@core/components/ui/select/select.component';

@Component({
  selector: 'app-settings-tab-voices',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideSquare,
    LucidePlay,
    LucideEye,
    LucideEyeOff,
    LucideExternalLink,
    AppSelectComponent,
  ],
  template: `
    <div class="space-y-5">
      <!-- 1. TTS Provider -->
      <div class="space-y-1.5">
        <app-select
          selectId="settings-tts-provider"
          [label]="t('voices.provider')"
          [options]="ttsProviderOptions()"
          [(value)]="ttsService.selectedProviderId"
          size="sm"
          color="primary"
        />
      </div>

      <!-- 2. API Key (only when provider requires custom key) -->
      @if (
        ttsService.selectedProviderId() !== 'default' &&
        selectedProviderMeta()?.hasCustomKeys
      ) {
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label
              for="settings-tts-api-key"
              class="text-xs font-medium tracking-wider text-base-content/50 uppercase"
            >
              API Key
              <span class="ml-1 text-base-content/40 normal-case"
                >({{ selectedProviderMeta()?.label }})</span
              >
            </label>
            @if (currentKeyValue()) {
              <span class="badge badge-xs badge-success">Active</span>
            } @else {
              <span class="badge badge-xs badge-warning">Required</span>
            }
          </div>

          <div class="join w-full">
            <input
              id="settings-tts-api-key"
              [type]="showKey() ? 'text' : 'password'"
              class="input-bordered input join-item flex-1 font-mono text-xs input-sm"
              [placeholder]="
                'Enter ' +
                (selectedProviderMeta()?.label || 'TTS') +
                ' API key…'
              "
              [value]="currentKeyValue()"
              (input)="onKeyChange($any($event.target).value)"
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
                title="Reset to server key"
              >
                Reset
              </button>
            }
          </div>

          @if (selectedProviderMeta()?.consoleUrl) {
            <a
              [href]="selectedProviderMeta()?.consoleUrl"
              target="_blank"
              rel="noopener"
              class="flex link items-center gap-1 text-xs link-primary"
            >
              Get API key
              <svg lucideExternalLink class="h-3 w-3"></svg>
            </a>
          }
        </div>
      }

      <!-- 3. TTS Model (when provider has multiple models) -->
      @if (isKeyReady() && providerModels().length > 0) {
        <div class="space-y-1.5">
          <app-select
            selectId="settings-tts-model"
            [label]="t('voices.model')"
            [options]="ttsModelOptions()"
            [(value)]="ttsService.selectedModelId"
            size="sm"
            color="primary"
          />
        </div>
      }

      <!-- 4. Tutor Voice -->
      <div class="space-y-1.5">
        <label
          for="settings-tutor-voice"
          class="text-xs font-medium tracking-wider text-base-content/50 uppercase"
        >
          {{ t('voices.title') }}
        </label>

        @if (!isKeyReady()) {
          <p
            class="rounded-lg border border-dashed border-base-300 bg-base-100/30 px-4 py-3 text-xs text-base-content/60"
          >
            Enter your {{ selectedProviderMeta()?.label || 'TTS provider' }} API
            key above to load voices, or select "Server Default".
          </p>
        } @else if (ttsService.loading()) {
          <div
            class="flex items-center gap-2 rounded-lg border border-base-300 bg-base-100/40 px-3 py-2.5"
          >
            <span
              class="loading loading-xs loading-spinner text-primary"
            ></span>
            <span class="text-xs text-base-content/60">Loading voices…</span>
          </div>
        } @else {
          <!-- Dropdown selector -->
          <div class="flex items-center gap-2">
            <app-select
              class="flex-1"
              selectId="settings-tutor-voice"
              [placeholder]="
                !ttsService.selectedVoiceId() ? '— Choose a voice —' : ''
              "
              [options]="voiceOptions()"
              [(value)]="ttsService.selectedVoiceId"
              (valueChange)="onSelectVoice($event)"
              size="sm"
              color="primary"
            />

            <!-- Play/Stop button — only for the active voice -->
            @if (ttsService.selectedVoiceId()) {
              <button
                type="button"
                class="btn btn-circle shrink-0 btn-sm"
                [class.btn-primary]="
                  playingVoiceId() === ttsService.selectedVoiceId()
                "
                [class.btn-ghost]="
                  playingVoiceId() !== ttsService.selectedVoiceId()
                "
                (click)="previewActiveVoice()"
                [attr.aria-label]="
                  playingVoiceId() ? 'Stop preview' : 'Preview voice'
                "
              >
                @if (playingVoiceId()) {
                  <svg lucideSquare class="h-3.5 w-3.5"></svg>
                } @else {
                  <svg lucidePlay class="h-3.5 w-3.5"></svg>
                }
              </button>
            }
          </div>

          <!-- Active voice badge row -->
          @if (ttsService.selectedVoiceId()) {
            <div class="flex items-center gap-1.5 px-0.5">
              <span class="badge badge-xs badge-primary">Selected Tutor</span>
              @if (availableVoicesList().length > 0) {
                <span class="text-[10px] text-base-content/40"
                  >{{ availableVoicesList().length }} available</span
                >
              }
            </div>
          }
        }
      </div>

      <!-- 5. STT Model -->
      <div class="space-y-1.5 border-t border-base-300 pt-4">
        <app-select
          selectId="settings-stt-model"
          [label]="t('voices.stt_model')"
          [options]="sttModelOptions"
          [(value)]="ttsService.selectedSttModel"
          size="sm"
          color="primary"
        />
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

  readonly isKeyReady = computed<boolean>(() => {
    const provider = this.ttsService.selectedProviderId();
    if (provider === 'default' || provider === 'browser') return true;
    const meta = this.selectedProviderMeta();
    if (!meta?.hasCustomKeys) return true;
    return !!this.currentKeyValue()?.trim();
  });

  readonly sttModels = [
    { id: 'whisper-large-v3-turbo', name: 'Whisper Large V3 Turbo (Fast)' },
    { id: 'whisper-large-v3', name: 'Whisper Large V3 (Accurate)' },
    { id: 'distil-whisper-large-v3-en', name: 'Distil Whisper Large (EN)' },
  ];

  /** TTS provider options for app-select (including server default). */
  readonly ttsProviderOptions = computed<SelectOption[]>(() => [
    { value: 'default', label: 'Server Default' },
    ...this.ttsService
      .providers()
      .map((p) => ({ value: p.id, label: p.label })),
  ]);

  /** TTS model options for app-select (depends on selected provider). */
  readonly ttsModelOptions = computed<SelectOption[]>(() =>
    this.providerModels().map((m) => ({ value: m.id, label: m.name })),
  );

  /** Voice options for app-select, includes gender in label when available. */
  readonly voiceOptions = computed<SelectOption[]>(() =>
    this.availableVoicesList().map((v) => ({
      value: v.id,
      label: v.name + (v.gender ? ` · ${v.gender}` : ''),
    })),
  );

  /** STT model options for app-select. */
  readonly sttModelOptions: SelectOption[] = this.sttModels.map((s) => ({
    value: s.id,
    label: s.name,
  }));

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

  onSelectVoice(voiceId: string | null): void {
    if (voiceId) {
      this.ttsService.setVoiceId(voiceId);
      this.voiceChange.emit(voiceId);
    }
  }

  /** Preview the currently selected voice (used by the single play button). */
  previewActiveVoice(): void {
    const activeId = this.ttsService.selectedVoiceId();
    if (!activeId) return;
    if (this.playingVoiceId() === activeId) {
      this.stopAudioPreview();
      return;
    }
    const voice = this.availableVoicesList().find((v) => v.id === activeId);
    if (voice) void this.previewVoice(voice);
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
        const blob = base64ToBlob(audioResult.audioData, audioResult.mimeType);
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
