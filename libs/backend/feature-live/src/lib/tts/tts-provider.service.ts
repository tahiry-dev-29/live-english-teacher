import { Injectable } from '@nestjs/common';
import {
  TTS_PROVIDERS_REGISTRY,
  TtsVoiceInfo,
  TtsProviderConfig,
  TtsModelInfo,
} from './tts-providers.registry';
import { ElevenLabsService } from './elevenlabs/elevenlabs.service';
import { TtsVoicesService } from './tts-voices.service';
import { TtsVendorsService } from './tts-vendors.service';
import {
  unsupportedProviderFailure,
  type TtsSynthesisOutcome,
} from './tts-failure.util';
import {
  effectiveKey,
  resolveProviderId,
  resolveVoice,
} from './tts-fallback.util';

/**
 * Facade: routing only — catalog in TtsVoicesService, audio in
 * ElevenLabsService (elevenlabs) / TtsVendorsService (other vendors).
 */
@Injectable()
export class TtsProviderService {
  constructor(
    private readonly elevenLabsService: ElevenLabsService,
    private readonly voices: TtsVoicesService,
    private readonly vendors: TtsVendorsService,
  ) {}

  getProviders(): TtsProviderConfig[] {
    return Object.values(TTS_PROVIDERS_REGISTRY);
  }

  async getVoices(
    options: { provider?: string; apiKey?: string } = {},
  ): Promise<TtsVoiceInfo[]> {
    const providerId =
      resolveProviderId(
        options.provider,
        Object.keys(TTS_PROVIDERS_REGISTRY),
      ) ?? '';
    const config = TTS_PROVIDERS_REGISTRY[providerId];
    if (!config) return [];
    // Live-only: no mocks. Without a key, [] so the UI prompts for a key.
    const key = effectiveKey(options.apiKey, config.keyEnv);
    if (!key) return [];

    if (providerId === 'azure') return this.voices.fetchAzureVoices(key);
    if (providerId === 'elevenlabs') {
      const live = await this.elevenLabsService.getVoicesLive(key);
      return live.map((v) => ({
        id: v.id,
        name: v.name,
        lang: v.lang,
        description: v.description,
        previewUrl: v.previewUrl,
      }));
    }
    if (providerId === 'google') return this.voices.fetchGoogleVoices(key);
    if (providerId === 'openai') return this.voices.fetchOpenAiVoices(key);
    // Polly / MiniMax have no public list endpoint — no mocks, return [].
    return [];
  }

  /** Live TTS models per provider. Returns [] when unavailable. */
  async getTtsModels(
    options: { provider?: string; apiKey?: string } = {},
  ): Promise<TtsModelInfo[]> {
    const providerId =
      resolveProviderId(
        options.provider,
        Object.keys(TTS_PROVIDERS_REGISTRY),
      ) ?? '';
    const config = TTS_PROVIDERS_REGISTRY[providerId];
    if (!config) return [];
    const key = effectiveKey(options.apiKey, config.keyEnv);
    if (!key) return [];

    if (providerId === 'elevenlabs') {
      return this.elevenLabsService.getModelsLive(key);
    }
    if (providerId === 'openai') {
      return this.voices.fetchOpenAiTtsModels(key);
    }
    if (config.defaultModel) {
      // Fixed engine names — expose the configured default as live config.
      return [{ id: config.defaultModel, name: config.defaultModel }];
    }
    return [];
  }

  /** Synthesis routed per vendor; failure carries the cause (never a bare null). */
  async synthesize(options: {
    provider?: string;
    voiceId?: string;
    modelId?: string;
    text: string;
    apiKey?: string;
    targetLanguage?: string;
  }): Promise<TtsSynthesisOutcome> {
    const requested = options.provider || 'elevenlabs';
    const providerId = resolveProviderId(
      options.provider,
      Object.keys(TTS_PROVIDERS_REGISTRY),
    );
    const config = providerId ? TTS_PROVIDERS_REGISTRY[providerId] : undefined;
    if (!providerId || !config) return unsupportedProviderFailure(requested);
    const key = effectiveKey(options.apiKey, config.keyEnv);
    const voice = resolveVoice(options.voiceId, config.defaultVoiceId);

    switch (providerId) {
      case 'elevenlabs':
        return this.elevenLabsService.generateTtsAudio(
          options.text,
          voice,
          key,
          options.modelId,
        );
      case 'openai':
        return this.vendors.openAi(
          options.text,
          voice,
          options.modelId || config.defaultModel || 'tts-1',
          key,
        );
      case 'azure':
        return this.vendors.azure(options.text, voice, key);
      case 'google':
        return this.vendors.google(options.text, voice, key);
      case 'polly':
        return this.vendors.polly(voice);
      case 'minimax':
        return this.vendors.minimax(options.text, voice, key);
      default:
        return unsupportedProviderFailure(requested);
    }
  }
}
