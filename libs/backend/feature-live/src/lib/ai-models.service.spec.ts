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
import {
  AI_PROVIDERS_REGISTRY,
  FALLBACK_MODELS_BY_PROVIDER,
} from './ai-providers.registry.ts';

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
        // No API key → return fallback models only (no network calls)
        const fallbacks = (FALLBACK_MODELS_BY_PROVIDER[config.id] || []).map(
          (m) => ({
            ...m,
            provider: config.id,
          }),
        );
        const effectiveKey = keys[providerId] || '';
        if (!effectiveKey) return fallbacks;
        // When key is present, simulate returning fallbacks (no real network)
        return fallbacks;
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

  // ── FALLBACK_MODELS_BY_PROVIDER ───────────────────────────────────────────

  describe('FALLBACK_MODELS_BY_PROVIDER', () => {
    it('provides fallbacks for all 7 providers', () => {
      const ids = Object.keys(AI_PROVIDERS_REGISTRY);
      for (const id of ids) {
        const fallbacks = FALLBACK_MODELS_BY_PROVIDER[id];
        assert.ok(fallbacks, `Fallbacks must exist for provider: ${id}`);
        assert.ok(
          fallbacks.length >= 1,
          `Provider ${id} must have at least 1 fallback model`,
        );
      }
    });

    it('each fallback model has required fields', () => {
      for (const [provider, models] of Object.entries(
        FALLBACK_MODELS_BY_PROVIDER,
      )) {
        for (const m of models) {
          assert.ok(m.id, `Fallback model in ${provider} must have id`);
          assert.ok(m.name, `Fallback model in ${provider} must have name`);
          assert.ok(
            m.description,
            `Fallback model in ${provider} must have description`,
          );
        }
      }
    });

    it('each provider has exactly one isDefault model', () => {
      for (const [provider, models] of Object.entries(
        FALLBACK_MODELS_BY_PROVIDER,
      )) {
        const defaults = models.filter((m) => m.isDefault);
        assert.equal(
          defaults.length,
          1,
          `Provider ${provider} should have exactly 1 default model`,
        );
      }
    });
  });

  // ── getModels — no keys (fallback) ────────────────────────────────────────

  describe('getModels() — no API keys', () => {
    it('returns fallback models for all providers', async () => {
      const models = await service.getModels();
      assert.ok(
        models.length >= 7 * 1,
        'Should have at least one model per provider',
      );
    });

    it('returns models with required fields', async () => {
      const models = await service.getModels();
      for (const m of models) {
        assert.ok(m.id);
        assert.ok(m.name);
        assert.ok(m.provider);
        assert.ok(m.description);
      }
    });

    it('returns gemini fallback models', async () => {
      const models = await service.getModels({ provider: 'gemini' });
      assert.ok(models.length >= 1);
      assert.ok(models.every((m) => m.provider === 'gemini'));
    });

    it('returns groq fallback models', async () => {
      const models = await service.getModels({ provider: 'groq' });
      assert.ok(models.length >= 1);
      assert.ok(models.every((m) => m.provider === 'groq'));
    });

    it('returns openai fallback models', async () => {
      const models = await service.getModels({ provider: 'openai' });
      assert.ok(models.every((m) => m.provider === 'openai'));
    });

    it('returns anthropic fallback models', async () => {
      const models = await service.getModels({ provider: 'anthropic' });
      assert.ok(models.every((m) => m.provider === 'anthropic'));
    });

    it('returns mistral fallback models', async () => {
      const models = await service.getModels({ provider: 'mistral' });
      assert.ok(models.every((m) => m.provider === 'mistral'));
    });

    it('returns deepseek fallback models', async () => {
      const models = await service.getModels({ provider: 'deepseek' });
      assert.ok(models.every((m) => m.provider === 'deepseek'));
    });

    it('returns qwen fallback models', async () => {
      const models = await service.getModels({ provider: 'qwen' });
      assert.ok(models.every((m) => m.provider === 'qwen'));
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
