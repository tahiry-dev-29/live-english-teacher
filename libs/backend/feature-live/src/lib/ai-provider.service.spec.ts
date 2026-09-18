/**
 * Unit tests — AiProviderService
 *
 * Tests provider routing logic for generateText() and generateStreamText():
 * - Routes to groq, gemini, or openai-compat based on provider/env
 * - Audio input forces gemini path
 * - Custom API key forwarding
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Mock services ─────────────────────────────────────────────────────────────

class MockGeminiLiveService {
  calls: any[] = [];

  async getGeminiChatResponse(
    history: any[],
    content: string,
    audioData?: string,
    _mimeType?: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({
      provider: 'gemini',
      content,
      audioData,
      targetLanguage,
      model,
      apiKey,
    });
    return `### Gemini: ${content}`;
  }

  async *generateStream() {
    yield '### Gemini stream';
  }
}

class MockGroqLiveService {
  calls: any[] = [];

  async getGroqChatResponse(
    history: any[],
    content: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({
      provider: 'groq',
      content,
      targetLanguage,
      model,
      apiKey,
    });
    return `### Groq: ${content}`;
  }

  async *generateStream(
    history: any[],
    content: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({ provider: 'groq-stream', content, apiKey });
    yield `Groq stream: ${content}`;
  }
}

class MockOpenAiCompatService {
  calls: any[] = [];

  async getChatResponse(
    provider: string,
    history: any[],
    content: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({ provider, content, targetLanguage, model, apiKey });
    return `### OpenAI-compat (${provider}): ${content}`;
  }

  async *generateStream(
    provider: string,
    history: any[],
    content: string,
    targetLanguage?: string,
    model?: string,
    apiKey?: string,
  ) {
    this.calls.push({ provider, content, apiKey });
    yield `Stream (${provider}): ${content}`;
  }
}

// ── Inline AiProviderService (without NestJS decorators) ─────────────────────

type AiHistoryMessage = { role: 'user' | 'model'; text: string };

class AiProviderService {
  constructor(
    private readonly geminiLiveService: MockGeminiLiveService,
    private readonly groqLiveService: MockGroqLiveService,
    private readonly openAiCompatService: MockOpenAiCompatService,
    private readonly envProvider: string = 'gemini',
  ) {}

  get provider(): string {
    return this.envProvider;
  }

  generateText(
    history: AiHistoryMessage[],
    content: string,
    options: {
      audioData?: string;
      mimeType?: string;
      targetLanguage?: string;
      model?: string;
      provider?: string;
      groqApiKey?: string;
      geminiApiKey?: string;
      customApiKey?: string;
    } = {},
  ): Promise<string> {
    const activeProvider =
      options.provider && options.provider !== 'default'
        ? options.provider
        : this.provider;

    if (activeProvider === 'groq' && !options.audioData) {
      return this.groqLiveService.getGroqChatResponse(
        history,
        content,
        options.targetLanguage || 'English',
        options.model,
        options.groqApiKey || options.customApiKey,
      );
    }

    if (activeProvider === 'gemini' || options.audioData) {
      return this.geminiLiveService.getGeminiChatResponse(
        history,
        content,
        options.audioData,
        options.mimeType,
        options.targetLanguage,
        options.model,
        options.geminiApiKey || options.customApiKey,
      );
    }

    return this.openAiCompatService.getChatResponse(
      activeProvider,
      history,
      content,
      options.targetLanguage || 'English',
      options.model,
      options.customApiKey,
    );
  }

  async *generateStreamText(
    history: AiHistoryMessage[],
    content: string,
    targetLanguage = 'English',
    options: {
      model?: string;
      provider?: string;
      groqApiKey?: string;
      geminiApiKey?: string;
      customApiKey?: string;
    } = {},
  ): AsyncGenerator<string, void, unknown> {
    const activeProvider =
      options.provider && options.provider !== 'default'
        ? options.provider
        : this.provider;

    if (activeProvider === 'groq') {
      yield* this.groqLiveService.generateStream(
        history,
        content,
        targetLanguage,
        options.model,
        options.groqApiKey || options.customApiKey,
      );
      return;
    }

    if (activeProvider === 'gemini') {
      const text = await this.geminiLiveService.getGeminiChatResponse(
        history,
        content,
        undefined,
        undefined,
        targetLanguage,
        options.model,
        options.geminiApiKey || options.customApiKey,
      );
      yield text;
      return;
    }

    yield* this.openAiCompatService.generateStream(
      activeProvider,
      history,
      content,
      targetLanguage,
      options.model,
      options.customApiKey,
    );
  }
}

// ── Test Setup ────────────────────────────────────────────────────────────────

let gemini: MockGeminiLiveService;
let groq: MockGroqLiveService;
let openai: MockOpenAiCompatService;

describe('AiProviderService', () => {
  beforeEach(() => {
    gemini = new MockGeminiLiveService();
    groq = new MockGroqLiveService();
    openai = new MockOpenAiCompatService();
  });

  // ── generateText — routing ────────────────────────────────────────────────

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

  // ── generateText — API key forwarding ────────────────────────────────────

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

    it('forwards customApiKey to openai-compat service', async () => {
      const svc = new AiProviderService(gemini, groq, openai, 'gemini');
      await svc.generateText([], 'hello', {
        provider: 'openai',
        customApiKey: 'oai-key',
      });
      assert.equal(openai.calls[0].apiKey, 'oai-key');
    });
  });

  // ── generateText — options ────────────────────────────────────────────────

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

  // ── generateStreamText ────────────────────────────────────────────────────

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
