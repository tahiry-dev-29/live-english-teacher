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

describe('AiProviderService — openai-compat/stream', () => {
  beforeEach(() => {
    gemini = new MockGeminiLiveService();
    groq = new MockGroqLiveService();
    openai = new MockOpenAiCompatService();
  });

  describe('generateText() — provider routing', () => {
    it('routes to openai-compat for "openai" provider', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      const text = await svc.generateText([], 'hello', { provider: 'openai' });
      assert.ok(text.includes('openai'));
      assert.equal(openai.calls.length, 1);
    });

    it('routes to openai-compat for "anthropic" provider', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'hello', { provider: 'anthropic' });
      assert.equal(openai.calls[0].provider, 'anthropic');
    });

    it('routes to openai-compat for "mistral" provider', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'hello', { provider: 'mistral' });
      assert.equal(openai.calls[0].provider, 'mistral');
    });

  });

  describe('generateText() — API key forwarding', () => {
    it('forwards customApiKey to openai-compat service', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'hello', {
        provider: 'openai',
        customApiKey: 'oai-key',
      });
      assert.equal(openai.calls[0].apiKey, 'oai-key');
    });
  });


  describe('generateStreamText() — streaming routing', () => {
    async function collectStream(
      gen: AsyncGenerator<string>,
    ): Promise<string[]> {
      const tokens: string[] = [];
      for await (const t of gen) tokens.push(t);
      return tokens;
    }

    it('streams from groq when provider = "groq"', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      const tokens = await collectStream(
        svc.generateStreamText([], 'hello', 'en', { provider: 'groq' }),
      );
      assert.ok(tokens.some((t) => t.includes('Groq')));
    });

    it('streams from gemini (as single chunk) for gemini provider', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      const tokens = await collectStream(
        svc.generateStreamText([], 'hello', 'en'),
      );
      assert.ok(tokens.some((t) => t.includes('Gemini')));
    });

    it('streams from openai-compat for other providers', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      const tokens = await collectStream(
        svc.generateStreamText([], 'hello', 'en', { provider: 'openai' }),
      );
      assert.ok(tokens.some((t) => t.includes('openai')));
    });

    it('forwards groqApiKey in streaming mode', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await collectStream(
        svc.generateStreamText([], 'hi', 'en', {
          provider: 'groq',
          groqApiKey: 'sk-groq',
        }),
      );
      assert.equal(groq.calls[0].apiKey, 'sk-groq');
    });
});
});
