import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiProviderService,
  MockGeminiLiveService,
  MockGroqLiveService,
  MockOpenAiCompatService,
} from './ai-provider.spec-fixtures.ts';

let gemini: MockGeminiLiveService;
let groq: MockGroqLiveService;
let openai: MockOpenAiCompatService;

describe('AiProviderService — gemini/groq', () => {
  beforeEach(() => {
    gemini = new MockGeminiLiveService();
    groq = new MockGroqLiveService();
    openai = new MockOpenAiCompatService();
  });

  describe('generateText() — provider routing', () => {
    it('routes to gemini by default (env = gemini)', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      const text = await svc.generateText([], 'hello');
      assert.ok(text.includes('Gemini'));
      assert.equal(gemini.calls.length, 1);
      assert.equal(groq.calls.length, 0);
    });

    it('routes to groq when provider = "groq" and no audio', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      const text = await svc.generateText([], 'hello', { provider: 'groq' });
      assert.ok(text.includes('Groq'));
      assert.equal(groq.calls.length, 1);
      assert.equal(gemini.calls.length, 0);
    });

    it('routes to gemini when audioData is provided (overrides groq)', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'groq');
      const text = await svc.generateText([], 'hello', {
        provider: 'groq',
        audioData: 'base64audio==',
        mimeType: 'audio/webm',
      });
      assert.ok(text.includes('Gemini'));
      assert.equal(gemini.calls.length, 1);
      assert.equal(groq.calls.length, 0);
    });

    it('ignores "default" as a provider and falls back to env provider', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'groq');
      await svc.generateText([], 'hello', { provider: 'default' });
      assert.equal(
        groq.calls.length,
        1,
        '"default" should resolve to env provider (groq)',
      );
    });
  });


  describe('generateText() — API key forwarding', () => {
    it('forwards groqApiKey to groq service', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'hello', {
        provider: 'groq',
        groqApiKey: 'my-groq-key',
      });
      assert.equal(groq.calls[0].apiKey, 'my-groq-key');
    });

    it('uses customApiKey as fallback for groq when no groqApiKey', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'hello', {
        provider: 'groq',
        customApiKey: 'custom-key',
      });
      assert.equal(groq.calls[0].apiKey, 'custom-key');
    });

    it('forwards geminiApiKey to gemini service', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'hello', { geminiApiKey: 'my-gemini-key' });
      assert.equal(gemini.calls[0].apiKey, 'my-gemini-key');
    });

  });

  describe('generateText() — options passthrough', () => {
    it('passes targetLanguage to groq', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'bonjour', {
        provider: 'groq',
        targetLanguage: 'French',
      });
      assert.equal(groq.calls[0].targetLanguage, 'French');
    });

    it('passes model to groq', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'hello', {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
      });
      assert.equal(groq.calls[0].model, 'llama-3.1-8b-instant');
    });

    it('passes model to gemini', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'hello', { model: 'gemini-2.0-flash' });
      assert.equal(gemini.calls[0].model, 'gemini-2.0-flash');
    });
});
});
