import { Injectable, Logger } from '@nestjs/common';
import {
  AI_PROVIDERS_REGISTRY,
  AiProviderConfig,
} from './ai-providers.registry';

export interface DiscoveredAiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  size?: string;
  contextWindow?: number;
  isDefault?: boolean;
}

interface OpenAiRawModel {
  id: string;
  owned_by?: string;
}

interface GeminiRawModel {
  name: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

interface AnthropicRawModel {
  id: string;
  display_name?: string;
  description?: string;
}

@Injectable()
export class AiModelsService {
  private readonly logger = new Logger(AiModelsService.name);

  async getModels(
    options: {
      provider?: string;
      keys?: Record<string, string>;
      groqApiKey?: string;
      geminiApiKey?: string;
    } = {},
  ): Promise<DiscoveredAiModel[]> {
    const keys: Record<string, string> = {
      ...(options.keys || {}),
    };
    if (options.groqApiKey) keys['groq'] = options.groqApiKey;
    if (options.geminiApiKey) keys['gemini'] = options.geminiApiKey;

    const targetProviders = options.provider
      ? [options.provider]
      : Object.keys(AI_PROVIDERS_REGISTRY);

    const modelPromises = targetProviders.map(async (providerId) => {
      const config = AI_PROVIDERS_REGISTRY[providerId];
      if (!config) return [];
      const effectiveKey = keys[providerId] || process.env[config.keyEnv] || '';
      return this.fetchModelsForProvider(config, effectiveKey);
    });

    const results = await Promise.all(modelPromises);
    return results.flat();
  }

  private async fetchModelsForProvider(
    config: AiProviderConfig,
    apiKey: string,
  ): Promise<DiscoveredAiModel[]> {
    // Live-only: no mocks. Without a key we return [] so the UI
    // prompts for a key instead of showing stale data.
    if (!apiKey) return [];

    if (config.id === 'gemini') {
      return this.fetchGeminiModels(apiKey);
    }

    if (config.id === 'anthropic') {
      return this.fetchAnthropicModels(config, apiKey);
    }

    if (config.chatApi === 'openai-compatible' && config.modelsUrl) {
      return this.fetchOpenAiCompatibleModels(config, apiKey);
    }

    return [];
  }

  private async fetchOpenAiCompatibleModels(
    config: AiProviderConfig,
    apiKey: string,
  ): Promise<DiscoveredAiModel[]> {
    try {
      const res = await fetch(config.modelsUrl as string, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { data?: OpenAiRawModel[] };
      const rawList = data.data || [];

      const filtered = rawList.filter((m) => {
        const id = m.id.toLowerCase();
        if (
          id.includes('whisper') ||
          id.includes('tts') ||
          id.includes('dall-e') ||
          id.includes('embed') ||
          id.includes('moderation') ||
          id.includes('guard')
        ) {
          return false;
        }
        return true;
      });

      if (filtered.length === 0) return [];

      return filtered.slice(0, 20).map((m, idx) => ({
        id: m.id,
        name: this.formatModelName(m.id),
        provider: config.id,
        description: `Live from ${config.label}`,
        size: this.extractSize(m.id),
        isDefault: idx === 0 || m.id === config.defaultModel,
      }));
    } catch (e) {
      this.logger.warn(`Live models fetch failed for ${config.id}: ${e}`);
      return [];
    }
  }

  private async fetchGeminiModels(
    apiKey: string,
  ): Promise<DiscoveredAiModel[]> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return [];

      const body = (await response.json()) as { models?: GeminiRawModel[] };
      const rawList = body.models || [];

      const filtered = rawList.filter((m) => {
        const name = m.name.toLowerCase();
        const methods = m.supportedGenerationMethods || [];
        if (!methods.includes('generateContent')) return false;
        if (
          name.includes('embedding') ||
          name.includes('aqa') ||
          name.includes('imagen') ||
          name.includes('robotics')
        ) {
          return false;
        }
        return name.includes('gemini');
      });

      if (filtered.length === 0) return [];

      return filtered.map((m) => {
        const id = m.name.replace(/^models\//, '');
        return {
          id,
          name: m.displayName || id,
          provider: 'gemini',
          description: m.description
            ? m.description.slice(0, 100)
            : 'Live Google Gemini model',
          size: id.includes('pro') ? 'Pro' : 'Flash',
          isDefault: id === 'gemini-2.5-flash' || id === 'gemini-2.0-flash',
        };
      });
    } catch (e) {
      this.logger.warn(`Live Gemini models fetch failed: ${e}`);
      return [];
    }
  }

  private async fetchAnthropicModels(
    config: AiProviderConfig,
    apiKey: string,
  ): Promise<DiscoveredAiModel[]> {
    try {
      const res = await fetch(config.modelsUrl as string, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: AnthropicRawModel[] };
      const rawList = body.data || [];
      if (rawList.length === 0) return [];
      return rawList.slice(0, 20).map((m, idx) => ({
        id: m.id,
        name: m.display_name || this.formatModelName(m.id),
        provider: config.id,
        description: m.description
          ? m.description.slice(0, 100)
          : `Live from ${config.label}`,
        size: undefined,
        isDefault: idx === 0 || m.id === config.defaultModel,
      }));
    } catch (e) {
      this.logger.warn(`Live Anthropic models fetch failed: ${e}`);
      return [];
    }
  }

  private formatModelName(id: string): string {
    return id
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private extractSize(id: string): string | undefined {
    const match = id.match(/(\d+b)/i);
    return match ? match[1].toUpperCase() : undefined;
  }
}
