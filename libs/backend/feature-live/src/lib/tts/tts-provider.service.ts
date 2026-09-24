import { Injectable } from '@nestjs/common';
import {
  TTS_PROVIDERS_REGISTRY,
  TtsVoiceInfo,
  TtsProviderConfig,
  TtsModelInfo,
} from './tts-providers.registry';
import { ElevenLabsService } from './elevenlabs/elevenlabs.service';
import { TtsVoicesService } from './tts-voices.service';
import { TtsSynthesizeService } from './tts-synthesize.service';
import {
  effectiveKey,
  resolveProviderId,
  resolveVoice,
} from './tts-fallback.util';

export interface TtsSynthesisResult {
  audioData: string;
  mimeType: string;
}

/** Facade: routing only — catalog in TtsVoicesService, audio in TtsSynthesizeService. */
@Injectable()
export class TtsProviderService {
  constructor(
    private readonly elevenLabsService: ElevenLabsService,
    private readonly voices: TtsVoicesService,
    private readonly synth: TtsSynthesizeService,
  ) {}

  getProviders(): TtsProviderConfig[] {
    return Object.values(TTS_PROVIDERS_REGISTRY);
  }

  async getVoices(
    options: { provider?: string; apiKey?: string } = {},
  ): Promise<TtsVoiceInfo[]> {
    const providerId =
      resolveProviderId(options.provider, Object.keys(TTS_PROVIDERS_REGISTRY)) ?? '';
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
      resolveProviderId(options.provider, Object.keys(TTS_PROVIDERS_REGISTRY)) ?? '';
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

  async synthesize(options: {
    provider?: string;
    voiceId?: string;
    modelId?: string;
    text: string;
    apiKey?: string;
    targetLanguage?: string;
  }): Promise<TtsSynthesisResult | null> {
    const providerId = resolveProviderId(
      options.provider,
      Object.keys(TTS_PROVIDERS_REGISTRY),
    );
    const config = providerId ? TTS_PROVIDERS_REGISTRY[providerId] : undefined;
    if (!providerId || !config) return null;
    const key = effectiveKey(options.apiKey, config.keyEnv);
    const voice = resolveVoice(options.voiceId, config.defaultVoiceId);

    switch (providerId) {
      case 'elevenlabs':
        return this.synth.elevenLabs(options.text, voice, key, options.modelId);
      case 'openai':
        return this.synth.openAi(
          options.text,
          voice,
          options.modelId || config.defaultModel || 'tts-1',
          key,
        );
      case 'azure':
        return this.synth.azure(options.text, voice, key);
      case 'google':
        return this.synth.google(options.text, voice, key);
      case 'polly':
        return this.synth.polly(voice);
      case 'minimax':
        return this.synth.minimax(options.text, voice, key);
      default:
        return null;
    }
  }
}
