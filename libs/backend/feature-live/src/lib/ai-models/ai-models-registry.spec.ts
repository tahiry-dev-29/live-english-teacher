import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AI_PROVIDERS_REGISTRY } from '../ai-chat/ai-providers.registry.ts';
import { AiModelsService } from './ai-models-double.spec-helper.ts';

let service: AiModelsService;

describe('AiModelsService — registry', () => {
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
      const mod = await import('../ai-chat/ai-providers.registry.ts');
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
});
