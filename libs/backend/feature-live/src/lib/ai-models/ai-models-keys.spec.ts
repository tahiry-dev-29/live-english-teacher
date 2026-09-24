import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AiModelsService } from './ai-models-double.spec-helper.ts';

let service: AiModelsService;

describe('AiModelsService — keys/utils', () => {
  beforeEach(() => {
    service = new AiModelsService();
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
