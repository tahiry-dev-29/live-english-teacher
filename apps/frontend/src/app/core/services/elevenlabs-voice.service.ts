import { Injectable, signal, inject, computed } from '@angular/core';
import { environment } from '@environment';
import { MESSAGES } from '@core/constants/messages';
import { ApiKeyService } from './api-key.service';

export interface TtsVoice {
  id: string;
  name: string;
  lang: string;
  gender?: 'male' | 'female' | 'neutral';
  description?: string;
  previewUrl?: string;
}

export interface TtsModel {
  id: string;
  name: string;
  description?: string;
}

export interface TtsProviderMeta {
  id: string;
  label: string;
  quotaNote: string;
  quality: string;
  review: string;
  keyHeader: string;
  consoleUrl: string;
  defaultModel?: string;
  defaultVoiceId: string;
  hasCustomKeys: boolean;
}

// Provider metadata only (static config). Voices + models are live-only.
export const KNOWN_TTS_PROVIDERS: TtsProviderMeta[] = [
  {
    id: 'azure',
    label: 'Azure Speech',
    quotaNote: '500 000 chars/mo (free lifetime)',
    quality: 'Neural HD',
    review: 'Best choice (quota + natural voices)',
    keyHeader: 'x-azure-tts-key',
    consoleUrl:
      'https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.CognitiveServices%2Faccounts',
    defaultModel: 'neural',
    defaultVoiceId: 'en-US-JennyNeural',
    hasCustomKeys: true,
  },
  {
    id: 'google',
    label: 'Google Cloud TTS',
    quotaNote: '1M to 4M chars/mo free',
    quality: 'Fluid Neural',
    review: 'Ultra generous volume',
    keyHeader: 'x-google-tts-key',
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    defaultModel: 'Journey',
    defaultVoiceId: 'en-US-Journey-F',
    hasCustomKeys: true,
  },
  {
    id: 'polly',
    label: 'AWS Polly',
    quotaNote: '1M to 5M chars/mo (12 mo free tier)',
    quality: 'Neural Standard',
    review: 'Free first 12 months',
    keyHeader: 'x-aws-polly-key',
    consoleUrl: 'https://console.aws.amazon.com/polly/',
    defaultModel: 'neural',
    defaultVoiceId: 'Joanna',
    hasCustomKeys: true,
  },
  {
    id: 'openai',
    label: 'OpenAI Audio',
    quotaNote: 'Paid (pay-as-you-go)',
    quality: 'Natural HD',
    review: 'High quality neural speech',
    keyHeader: 'x-openai-api-key',
    consoleUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'tts-1',
    defaultVoiceId: 'alloy',
    hasCustomKeys: true,
  },
  {
    id: 'minimax',
    label: 'MiniMax Audio',
    quotaNote: 'Trial credits available',
    quality: 'Expressive',
    review: 'Expressive and multilingual',
    keyHeader: 'x-minimax-tts-key',
    consoleUrl: 'https://api.minimax.chat/',
    defaultModel: 'speech-01-turbo',
    defaultVoiceId: 'female-tutor-01',
    hasCustomKeys: true,
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    quotaNote: 'Account free/paid tier',
    quality: 'Ultra Natural',
    review: 'Industry leading voice cloning & naturalness',
    keyHeader: 'x-elevenlabs-api-key',
    consoleUrl: 'https://elevenlabs.io/app/speech-synthesis',
    defaultModel: 'eleven_multilingual_v2',
    defaultVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
    hasCustomKeys: true,
  },
  {
    id: 'browser',
    label: 'Web Speech (Browser)',
    quotaNote: 'Unlimited local',
    quality: 'System Voice',
    review: 'Always available offline fallback',
    keyHeader: '',
    consoleUrl: '',
    defaultVoiceId: 'default',
    hasCustomKeys: false,
  },
];

@Injectable({
  providedIn: 'root',
})
export class ElevenLabsVoiceService {
  private static readonly STORAGE_KEY_PROVIDER = 'tts_selected_provider';
  private static readonly STORAGE_KEY_VOICE = 'tts_selected_voice_id';
  private static readonly STORAGE_KEY_MODEL = 'tts_selected_model_id';
  private static readonly STORAGE_KEY_STT_MODEL = 'stt_selected_model_id';
  private static readonly IDLE_DEFER_MS = 1500;

  private readonly apiKeyService = inject(ApiKeyService);

  readonly providers = signal<TtsProviderMeta[]>(KNOWN_TTS_PROVIDERS);
  readonly selectedProviderId = signal<string>(
    this.loadStorage(ElevenLabsVoiceService.STORAGE_KEY_PROVIDER, 'elevenlabs'),
  );
  readonly selectedVoiceId = signal<string>(
    this.loadStorage(ElevenLabsVoiceService.STORAGE_KEY_VOICE, ''),
  );
  readonly selectedModelId = signal<string>(
    this.loadStorage(ElevenLabsVoiceService.STORAGE_KEY_MODEL, ''),
  );
  readonly selectedSttModel = signal<string>(
    this.loadStorage(
      ElevenLabsVoiceService.STORAGE_KEY_STT_MODEL,
      'whisper-large-v3-turbo',
    ),
  );

  // Live-only: starts empty, filled from /ai/voices. No hardcoded voices.
  readonly voices = signal<TtsVoice[]>([]);
  readonly ttsModels = signal<TtsModel[]>([]);
  readonly liveError = signal<string | null>(null);

  readonly loading = signal<boolean>(false);

  readonly currentProviderMeta = computed<TtsProviderMeta | undefined>(() =>
    this.providers().find((p) => p.id === this.selectedProviderId()),
  );

  constructor() {
    this.scheduleIdleLoad();
  }

  /** Chunked init (task 88): voices/models/providers are only needed when the
   * settings dialog or TTS runs — load on browser idle so first paint is free. */
  private scheduleIdleLoad(): void {
    if (typeof window === 'undefined') return;
    const run = (): void => {
      void this.fetchProviders();
      void this.loadVoicesForProvider(this.selectedProviderId());
      void this.loadTtsModelsForProvider(this.selectedProviderId());
    };
    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => void;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      ric.call(window, run, { timeout: 2500 });
    } else {
      setTimeout(run, ElevenLabsVoiceService.IDLE_DEFER_MS);
    }
  }

  setProviderId(providerId: string): void {
    this.selectedProviderId.set(providerId);
    this.saveStorage(ElevenLabsVoiceService.STORAGE_KEY_PROVIDER, providerId);
    const meta = this.providers().find((p) => p.id === providerId);
    if (meta) {
      // Reset selection; live voices/models will repopulate.
      this.selectedVoiceId.set('');
      this.saveStorage(ElevenLabsVoiceService.STORAGE_KEY_VOICE, '');
      if (meta.defaultModel) {
        this.selectedModelId.set(meta.defaultModel);
        this.saveStorage(
          ElevenLabsVoiceService.STORAGE_KEY_MODEL,
          meta.defaultModel,
        );
      }
    }
    void this.loadVoicesForProvider(providerId);
    void this.loadTtsModelsForProvider(providerId);
  }

  setVoiceId(id: string): void {
    this.selectedVoiceId.set(id);
    this.saveStorage(ElevenLabsVoiceService.STORAGE_KEY_VOICE, id);
  }

  setModelId(id: string): void {
    this.selectedModelId.set(id);
    this.saveStorage(ElevenLabsVoiceService.STORAGE_KEY_MODEL, id);
  }

  setSttModel(model: string): void {
    this.selectedSttModel.set(model);
    this.saveStorage(ElevenLabsVoiceService.STORAGE_KEY_STT_MODEL, model);
  }

  async fetchProviders(): Promise<void> {
    try {
      const res = await fetch(`${environment.apiBaseUrl}/ai/tts-providers`);
      if (res.ok) {
        const data = (await res.json()) as TtsProviderMeta[];
        if (Array.isArray(data) && data.length > 0) {
          this.providers.set(data);
        }
      }
    } catch {
      // keep static provider metadata (config, not mock voices)
    }
  }

  async loadVoicesForProvider(providerId?: string): Promise<void> {
    const activeProvider = providerId || this.selectedProviderId();
    if (activeProvider === 'browser') {
      this.voices.set([
        {
          id: 'default',
          name: 'Browser Default Voice',
          lang: 'en-US',
          description: 'System text-to-speech engine (Web Speech API)',
        },
      ]);
      this.liveError.set(null);
      return;
    }

    this.loading.set(true);
    this.liveError.set(null);
    try {
      const headers = this.apiKeyService.getTtsHeaders(activeProvider);
      const res = await fetch(`${environment.apiBaseUrl}/ai/voices`, {
        headers,
      });
      if (res.ok) {
        const data = (await res.json()) as TtsVoice[];
        if (Array.isArray(data) && data.length > 0) {
          this.voices.set(data);
          if (!data.some((v) => v.id === this.selectedVoiceId())) {
            this.selectedVoiceId.set(data[0].id);
            this.saveStorage(
              ElevenLabsVoiceService.STORAGE_KEY_VOICE,
              data[0].id,
            );
          }
        } else {
          this.voices.set([]);
          this.liveError.set(
            'No live voices. Add an API key for this provider.',
          );
        }
      } else {
        this.voices.set([]);
        this.liveError.set(
          `Live voices unavailable (${res.status}). Add an API key.`,
        );
      }
    } catch {
      this.voices.set([]);
      this.liveError.set('Live voices fetch failed. Check network / API key.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadTtsModelsForProvider(providerId?: string): Promise<void> {
    const activeProvider = providerId || this.selectedProviderId();
    if (activeProvider === 'browser') {
      this.ttsModels.set([]);
      return;
    }
    try {
      const headers = this.apiKeyService.getTtsHeaders(activeProvider);
      const res = await fetch(`${environment.apiBaseUrl}/ai/tts-models`, {
        headers,
      });
      if (res.ok) {
        const data = (await res.json()) as TtsModel[];
        if (Array.isArray(data) && data.length > 0) {
          this.ttsModels.set(data);
          if (!data.some((m) => m.id === this.selectedModelId())) {
            this.selectedModelId.set(data[0].id);
          }
          return;
        }
      }
      this.ttsModels.set([]);
    } catch {
      this.ttsModels.set([]);
    }
  }

  async generateSpeechAudio(
    text: string,
    voiceId?: string,
    targetLanguage?: string,
  ): Promise<{ audioData: string; mimeType: string } | null> {
    const activeProvider = this.selectedProviderId();
    if (activeProvider === 'browser') {
      return null; // Signals client to use Web Speech directly
    }

    const selectedVoice = voiceId || this.selectedVoiceId();
    const selectedModel = this.selectedModelId() || undefined;

    const isServerDefault = activeProvider === 'default';

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.apiKeyService.getTtsHeaders(activeProvider),
      };

      const response = await fetch(`${environment.apiBaseUrl}/ai/tts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...(isServerDefault ? {} : { provider: activeProvider }),
          voiceId: selectedVoice,
          modelId: selectedModel,
          text,
          targetLanguage,
        }),
      });

      if (!response.ok) return null;

      const data = (await response.json()) as {
        audioData?: string;
        mimeType?: string;
      };
      if (data?.audioData) {
        return {
          audioData: data.audioData,
          mimeType: data.mimeType || 'audio/mpeg',
        };
      }
      return null;
    } catch (error) {
      console.warn(MESSAGES.log.ttsRequestFailed, error);
      return null;
    }
  }

  private loadStorage(key: string, fallback: string): string {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key) || fallback;
      }
    } catch {
      // ignore
    }
    return fallback;
  }

  private saveStorage(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // ignore
    }
  }
}
