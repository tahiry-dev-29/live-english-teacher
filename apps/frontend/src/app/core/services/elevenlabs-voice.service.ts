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
  models?: TtsModel[];
}

export const KNOWN_TTS_PROVIDERS: TtsProviderMeta[] = [
  {
    id: 'azure',
    label: 'Azure Speech',
    quotaNote: '500 000 chars/mo (free lifetime)',
    quality: '⭐⭐⭐⭐⭐ Neural',
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
    quality: '⭐⭐⭐⭐ Fluid',
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
    quality: '⭐⭐⭐ Good to very good',
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
    quality: '⭐⭐⭐⭐⭐ Natural',
    review: 'High quality neural speech',
    keyHeader: 'x-openai-api-key',
    consoleUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'tts-1',
    defaultVoiceId: 'alloy',
    hasCustomKeys: true,
    models: [
      { id: 'tts-1', name: 'TTS-1 (Standard, low latency)' },
      { id: 'tts-1-hd', name: 'TTS-1 HD (High Definition)' },
    ],
  },
  {
    id: 'minimax',
    label: 'MiniMax Audio',
    quotaNote: 'Trial credits available',
    quality: '⭐⭐⭐⭐ Expressive',
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
    quality: '⭐⭐⭐⭐⭐ Ultra Natural',
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
    quality: '⭐⭐ Dependent on OS',
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

  private readonly apiKeyService = inject(ApiKeyService);

  readonly providers = signal<TtsProviderMeta[]>(KNOWN_TTS_PROVIDERS);
  readonly selectedProviderId = signal<string>(
    this.loadStorage(ElevenLabsVoiceService.STORAGE_KEY_PROVIDER, 'elevenlabs'),
  );
  readonly selectedVoiceId = signal<string>(
    this.loadStorage(
      ElevenLabsVoiceService.STORAGE_KEY_VOICE,
      'JBFqnCBsd6RMkjVDRZzb',
    ),
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

  readonly voices = signal<TtsVoice[]>([
    {
      id: 'JBFqnCBsd6RMkjVDRZzb',
      name: 'George (Warm & Engaging)',
      lang: 'en-US',
      description: 'Deep, warm male voice',
    },
    {
      id: 'EXAVITQu4vr4xnSDxMaL',
      name: 'Sarah (Soft & Natural)',
      lang: 'en-US',
      description: 'Calm, friendly female voice',
    },
    {
      id: 'ErXwobaYiN019PkySvjV',
      name: 'Antoni (Dynamic & Clear)',
      lang: 'en-US',
      description: 'Energetic male voice',
    },
    {
      id: 'VR6AewLTigWG4xSOukaG',
      name: 'Arnold (Crisp & Clear)',
      lang: 'en-US',
      description: 'Authoritative male voice',
    },
    {
      id: 'pNInz6obpgDQGcFmaJgB',
      name: 'Adam (Smooth & Natural)',
      lang: 'en-US',
      description: 'Conversational male voice',
    },
    {
      id: 'onwK4e9ZLuTAKqWW03F9',
      name: 'Daniel (Deep British)',
      lang: 'en-GB',
      description: 'Professional British male',
    },
    {
      id: 'cgSgspJ2msm6clMCkdW9',
      name: 'Jessica (Bright & Playful)',
      lang: 'en-US',
      description: 'Young friendly female',
    },
    {
      id: 'iP95p4xoKVk53GoZ742B',
      name: 'Chris (Casual & Friendly)',
      lang: 'en-US',
      description: 'Casual conversational voice',
    },
  ]);

  readonly loading = signal<boolean>(false);

  readonly currentProviderMeta = computed<TtsProviderMeta | undefined>(() =>
    this.providers().find((p) => p.id === this.selectedProviderId()),
  );

  constructor() {
    this.fetchProviders();
    this.loadVoicesForProvider(this.selectedProviderId());
  }

  setProviderId(providerId: string): void {
    this.selectedProviderId.set(providerId);
    this.saveStorage(ElevenLabsVoiceService.STORAGE_KEY_PROVIDER, providerId);
    const meta = this.providers().find((p) => p.id === providerId);
    if (meta) {
      this.selectedVoiceId.set(meta.defaultVoiceId);
      this.saveStorage(
        ElevenLabsVoiceService.STORAGE_KEY_VOICE,
        meta.defaultVoiceId,
      );
      if (meta.defaultModel) {
        this.selectedModelId.set(meta.defaultModel);
        this.saveStorage(
          ElevenLabsVoiceService.STORAGE_KEY_MODEL,
          meta.defaultModel,
        );
      }
    }
    void this.loadVoicesForProvider(providerId);
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
      // keep fallback KNOWN_TTS_PROVIDERS
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
          description: 'System text-to-speech engine',
        },
      ]);
      return;
    }

    this.loading.set(true);
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
          }
        }
      }
    } catch {
      // ignore
    } finally {
      this.loading.set(false);
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

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.apiKeyService.getTtsHeaders(activeProvider),
      };

      const response = await fetch(`${environment.apiBaseUrl}/ai/tts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: activeProvider,
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
