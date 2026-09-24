/** Inline AiModelsService double for specs (task 98 split). */
import { AI_PROVIDERS_REGISTRY } from '../ai-chat/ai-providers.registry.ts';

// ── Inline AiModelsService (without NestJS/Logger) ───────────────────────────

interface DiscoveredAiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  size?: string;
  isDefault?: boolean;
}

export class AiModelsService {
  async getModels(
    options: {
      provider?: string;
      keys?: Record<string, string>;
      groqApiKey?: string;
      geminiApiKey?: string;
    } = {},
  ): Promise<DiscoveredAiModel[]> {
    const keys: Record<string, string> = { ...(options.keys || {}) };
    if (options.groqApiKey) keys['groq'] = options.groqApiKey;
    if (options.geminiApiKey) keys['gemini'] = options.geminiApiKey;

    const targetProviders = options.provider
      ? [options.provider]
      : Object.keys(AI_PROVIDERS_REGISTRY);

    const results = await Promise.all(
      targetProviders.map(async (providerId) => {
        const config = AI_PROVIDERS_REGISTRY[providerId];
        if (!config) return [];
        // Live-only: no API key → empty (no network, no mocks)
        const effectiveKey = keys[providerId] || '';
        if (!effectiveKey) return [];
        // With key, live fetch would happen; simulate 1 live model
        return [
          {
            id: `${providerId}-live-model`,
            name: `${config.label} Live`,
            provider: config.id,
            description: `Live from ${config.label}`,
          },
        ];
      }),
    );
    return results.flat();
  }

  formatModelName(id: string): string {
    return id
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  extractSize(id: string): string | undefined {
    const match = id.match(/(\d+b)/i);
    return match ? match[1].toUpperCase() : undefined;
  }
}
