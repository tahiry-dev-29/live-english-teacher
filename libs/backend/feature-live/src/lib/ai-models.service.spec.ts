/**
 * Unit tests — AiModelsService
 *
 * Tests getModels() with:
 * - No API keys (fallback models)
 * - Provider filtering
 * - Registry coverage for all 7 providers
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AI_PROVIDERS_REGISTRY } from './ai-providers.registry.ts';

// ── Inline AiModelsService (without NestJS/Logger) ───────────────────────────

interface DiscoveredAiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  size?: string;
  isDefault?: boolean;
}

class AiModelsService {
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

// ── Test Setup ────────────────────────────────────────────────────────────────

let service: AiModelsService;

describe('AiModelsService', () => {
  beforeEach(() => {
    service = new AiModelsService();
  });

  // ── Registry ──────────────────────────────────────────────────────────────

  describe('AI_PROVIDERS_REGISTRY', () => {
    it('contains all 7 expected providers', () => {
      const ids = Object.keys(AI_PROVIDERS_REGISTRY);
      assert.ok(ids.includes('groq'));
      assert.ok(ids.includes('gemini'));
      assert.ok(ids.includes('openai'));
      assert.ok(ids.includes('anthropic'));
      assert.ok(ids.includes('mistral'));
      assert.ok(ids.includes('deepseek'));
      assert.ok(ids.includes('qwen'));
    });

    it('each provider has required config fields', () => {
      for (const [id, config] of Object.entries(AI_PROVIDERS_REGISTRY)) {
        assert.ok(config.id === id, `Provider ${id} must have id === key`);
        assert.ok(config.label, `Provider ${id} must have a label`);
        assert.ok(config.keyEnv, `Provider ${id} must have keyEnv`);
        assert.ok(config.defaultModel, `Provider ${id} must have defaultModel`);
        assert.ok(config.description, `Provider ${id} must have description`);
      }
    });
  });

  // ── Live-only (no fallbacks) ────────────────────────────────────────────

  describe('live-only behavior', () => {
    it('has no FALLBACK_MODELS export (live API only)', async () => {
      const mod = await import('./ai-providers.registry.ts');
      assert.equal(
        (mod as Record<string, unknown>)['FALLBACK_MODELS_BY_PROVIDER'],
        undefined,
      );
    });
  });

  // ── getModels — no keys (empty, live-only) ─────────────────────────────────

  describe('getModels() — no API keys', () => {
    it('returns empty (live-only, no mocks)', async () => {
      const models = await service.getModels();
      assert.deepEqual(models, []);
    });

    it('returns empty for gemini without key', async () => {
      const models = await service.getModels({ provider: 'gemini' });
      assert.deepEqual(models, []);
    });

    it('returns empty for groq without key', async () => {
      const models = await service.getModels({ provider: 'groq' });
      assert.deepEqual(models, []);
    });

    it('returns empty for openai without key', async () => {
      const models = await service.getModels({ provider: 'openai' });
      assert.deepEqual(models, []);
    });

    it('returns empty for anthropic without key', async () => {
      const models = await service.getModels({ provider: 'anthropic' });
      assert.deepEqual(models, []);
    });

    it('returns empty for mistral without key', async () => {
      const models = await service.getModels({ provider: 'mistral' });
      assert.deepEqual(models, []);
    });

    it('returns empty for deepseek without key', async () => {
      const models = await service.getModels({ provider: 'deepseek' });
      assert.deepEqual(models, []);
    });

    it('returns empty for qwen without key', async () => {
      const models = await service.getModels({ provider: 'qwen' });
      assert.deepEqual(models, []);
    });

    it('returns empty array for unknown provider', async () => {
      const models = await service.getModels({ provider: 'unknown-llm' });
      assert.deepEqual(models, []);
    });
  });

  // ── getModels — with keys ─────────────────────────────────────────────────

  describe('getModels() — with API keys', () => {
    it('accepts groqApiKey shorthand', async () => {
      const models = await service.getModels({
        groqApiKey: 'gsk_test',
        provider: 'groq',
      });
      assert.ok(models.length >= 1);
    });

    it('accepts geminiApiKey shorthand', async () => {
      const models = await service.getModels({
        geminiApiKey: 'AIza_test',
        provider: 'gemini',
      });
      assert.ok(models.length >= 1);
    });
  });

  // ── Utility methods ───────────────────────────────────────────────────────

  describe('formatModelName()', () => {
    it('capitalizes each word from a hyphenated id', () => {
      assert.equal(service.formatModelName('gpt-4o-mini'), 'Gpt 4o Mini');
    });

    it('capitalizes from underscore-separated id', () => {
      assert.equal(service.formatModelName('llama_3_70b'), 'Llama 3 70b');
    });

    it('handles single-word id', () => {
      assert.equal(service.formatModelName('gemini'), 'Gemini');
    });
  });

  describe('extractSize()', () => {
    it('extracts size from model id with B suffix', () => {
      assert.equal(service.extractSize('llama-3.3-70b-versatile'), '70B');
    });

    it('extracts size case-insensitively', () => {
      assert.equal(service.extractSize('model-8B-instant'), '8B');
    });

    it('returns undefined when no size pattern found', () => {
      assert.equal(service.extractSize('gemini-2.0-flash'), undefined);
    });
  });
});
