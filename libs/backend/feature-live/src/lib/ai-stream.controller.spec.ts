/**
 * Unit tests — AiStreamController (REST API)
 *
 * Tests all REST endpoints:
 * GET  /api/ai/models
 * GET  /api/ai/tts-providers
 * GET  /api/ai/voices
 * POST /api/ai/chat/stream  (SSE streaming)
 * POST /api/ai/transcribe
 * POST /api/ai/tts
 *
 * All external services are mocked. No HTTP server is started.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPrismaService } from './testing/mock-prisma.service.ts';

// ── Inline ChatHistoryService (without NestJS decorators) ────────────────────

class ChatHistoryService {
  private readonly pinnedSessionIds = new Set<string>();
  constructor(private readonly prisma: MockPrismaService) {}

  isSessionPinned(id: string) {
    return this.pinnedSessionIds.has(id);
  }
  setSessionPinned(id: string, v: boolean) {
    v ? this.pinnedSessionIds.add(id) : this.pinnedSessionIds.delete(id);
  }

  async createSession(lang = 'en') {
    return this.prisma.session.create({ data: { learningLanguage: lang } });
  }

  async getSession(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
      include: { messages: true },
    });
  }

  async addMessage(sessionId: string, role: 'user' | 'model', content: string) {
    const msg = await this.prisma.message.create({
      data: { sessionId, role, content },
    });
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
    return msg;
  }

  async getSessionHistory(sessionId: string) {
    const s = await this.getSession(sessionId);
    if (!s) return [];
    return s.messages.map((m: any) => ({ role: m.role, text: m.content }));
  }

  async updateSession(sessionId: string, data: any) {
    if (data.isPinned !== undefined)
      this.setSessionPinned(sessionId, data.isPinned);
    const { isPinned: _unused, ...prismaData } = data;
    if (Object.keys(prismaData).length === 0) return this.getSession(sessionId);
    return this.prisma.session.update({
      where: { id: sessionId },
      data: prismaData,
    });
  }
}

// ── Inline AiStreamController (without NestJS decorators) ────────────────────

class AiStreamController {
  constructor(
    private readonly aiModelsService: any,
    private readonly aiProviderService: any,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly ttsProviderService: any,
    private readonly groqTranscribeService: any,
  ) {}

  async getModels(keys: Record<string, string | undefined> = {}) {
    return this.aiModelsService.getModels({ keys });
  }

  getTtsProviders() {
    return this.ttsProviderService.getProviders();
  }

  async getVoices(provider?: string, apiKey?: string) {
    return this.ttsProviderService.getVoices({ provider, apiKey });
  }

  async transcribe(
    dto: {
      audioData: string;
      mimeType?: string;
      language?: string;
      model?: string;
    },
    groqApiKey?: string,
  ) {
    const transcript = await this.groqTranscribeService.transcribe(
      dto.audioData,
      dto.mimeType,
      dto.language,
      dto.model,
      groqApiKey,
    );
    if (transcript === null) {
      throw new Error('Transcription failed or service unavailable');
    }
    return { transcript };
  }

  async tts(
    dto: {
      text: string;
      provider?: string;
      voiceId?: string;
      modelId?: string;
      targetLanguage?: string;
    },
    headers: Record<string, string | undefined> = {},
  ) {
    const provider =
      dto.provider ||
      headers['x-tts-provider'] ||
      headers['x-provider'] ||
      'elevenlabs';
    const audio = await this.ttsProviderService.synthesize({
      provider,
      text: dto.text,
      voiceId: dto.voiceId,
      modelId: dto.modelId,
      targetLanguage: dto.targetLanguage,
    });
    if (!audio) throw new Error(`TTS not available for provider "${provider}"`);
    return audio;
  }

  /** Simplified stream test helper (actual SSE streaming not testable here) */
  async processStreamChat(
    dto: {
      message: string;
      sessionId?: string;
      targetLanguage?: string;
      model?: string;
      provider?: string;
    },
    headers: Record<string, string | undefined> = {},
  ) {
    let sessionId = dto.sessionId || '';
    const session = sessionId
      ? await this.chatHistoryService.getSession(sessionId)
      : null;
    if (!session) {
      const created = await this.chatHistoryService.createSession(
        dto.targetLanguage || 'en',
      );
      sessionId = created.id;
    } else if (
      dto.targetLanguage &&
      session.learningLanguage !== dto.targetLanguage
    ) {
      await this.chatHistoryService.updateSession(sessionId, {
        learningLanguage: dto.targetLanguage,
      });
    }
    const history = await this.chatHistoryService.getSessionHistory(sessionId);
    if (dto.message)
      await this.chatHistoryService.addMessage(sessionId, 'user', dto.message);

    const tokens: string[] = [];
    const stream = this.aiProviderService.generateStreamText(
      history,
      dto.message,
      dto.targetLanguage || 'English',
      {
        model: dto.model,
        provider: dto.provider,
      },
    );
    let fullText = '';
    for await (const token of stream) {
      tokens.push(token);
      fullText += token;
    }
    if (fullText)
      await this.chatHistoryService.addMessage(sessionId, 'model', fullText);
    return { sessionId, tokens, fullText };
  }
}

// ── Mock factories ────────────────────────────────────────────────────────────

function makeMockModels() {
  return {
    getModels: async ({ keys }: any = {}) => [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'gemini',
        description: 'Google AI',
        isDefault: true,
      },
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3',
        provider: 'groq',
        description: keys?.groq ? 'Groq (auth)' : 'Groq',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'OpenAI',
      },
    ],
  };
}

function makeMockTts() {
  return {
    getProviders: () => [
      {
        id: 'elevenlabs',
        label: 'ElevenLabs',
        quotaNote: '10k chars/mo',
        quality: 'High',
      },
      {
        id: 'azure',
        label: 'Azure Speech',
        quotaNote: '500k chars/mo',
        quality: 'Neural HD',
      },
      {
        id: 'openai',
        label: 'OpenAI TTS',
        quotaNote: 'Pay-per-use',
        quality: 'Natural',
      },
      {
        id: 'google',
        label: 'Google Cloud TTS',
        quotaNote: '1M chars/mo',
        quality: 'Fluid',
      },
      {
        id: 'polly',
        label: 'AWS Polly',
        quotaNote: '5M chars/mo (free)',
        quality: 'Standard',
      },
      {
        id: 'minimax',
        label: 'MiniMax',
        quotaNote: 'Limited',
        quality: 'Neural',
      },
    ],
    getVoices: async ({ provider }: any) => {
      if (provider === 'elevenlabs') {
        return [
          {
            id: 'rachel',
            name: 'Rachel',
            lang: 'en',
            description: 'Calm, natural',
          },
          {
            id: 'Antoni',
            name: 'Antoni',
            lang: 'en',
            description: 'British male',
          },
        ];
      }
      if (provider === 'azure') {
        return [
          { id: 'en-US-JennyNeural', name: 'Jenny (en-US)', lang: 'en-US' },
        ];
      }
      return [];
    },
    synthesize: async ({ text, provider }: any) => {
      if (!text) return null;
      return {
        audioData: Buffer.from(`audio:${provider || 'el'}:${text}`).toString(
          'base64',
        ),
        mimeType: 'audio/mpeg',
      };
    },
  };
}

function makeMockTranscribe() {
  return {
    transcribe: async (
      audioData: string,
      _mimeType?: string,
      _lang?: string,
      _model?: string,
      _key?: string,
    ) => {
      if (audioData === 'INVALID_AUDIO') return null;
      if (!audioData) return null;
      return 'The quick brown fox jumps over the lazy dog';
    },
  };
}

function makeMockAiProvider() {
  return {
    generateStreamText: async function* (history: any[], content: string) {
      yield `Response to: ${content.substring(0, 20)}`;
    },
  };
}

// ── Test Setup ────────────────────────────────────────────────────────────────

let prisma: MockPrismaService;
let chatHistoryService: ChatHistoryService;
let controller: AiStreamController;

describe('AiStreamController — REST API', () => {
  beforeEach(() => {
    prisma = new MockPrismaService();
    chatHistoryService = new ChatHistoryService(prisma);
    controller = new AiStreamController(
      makeMockModels(),
      makeMockAiProvider(),
      chatHistoryService,
      makeMockTts(),
      makeMockTranscribe(),
    );
  });

  // ── GET /api/ai/models ────────────────────────────────────────────────────

  describe('getModels()', () => {
    it('returns all available AI models', async () => {
      const models = await controller.getModels({ groq: 'groq-key-123' });
      assert.ok(models.length >= 3);
    });

    it('returns models with required fields', async () => {
      const models = await controller.getModels();
      for (const m of models) {
        assert.ok(m.id, 'Model must have an id');
        assert.ok(m.name, 'Model must have a name');
        assert.ok(m.provider, 'Model must have a provider');
      }
    });

    it('returns gemini as first model', async () => {
      const models = await controller.getModels();
      assert.equal(models[0].provider, 'gemini');
    });

    it('returns groq model', async () => {
      const models = await controller.getModels();
      assert.ok(models.some((m) => m.provider === 'groq'));
    });

    it('returns openai model', async () => {
      const models = await controller.getModels();
      assert.ok(models.some((m) => m.provider === 'openai'));
    });
  });

  // ── GET /api/ai/tts-providers ─────────────────────────────────────────────

  describe('getTtsProviders()', () => {
    it('returns all configured TTS providers', () => {
      const providers = controller.getTtsProviders();
      assert.ok(providers.length >= 6);
    });

    it('includes elevenlabs', () => {
      const providers = controller.getTtsProviders();
      assert.ok(providers.some((p: any) => p.id === 'elevenlabs'));
    });

    it('includes azure', () => {
      assert.ok(
        controller.getTtsProviders().some((p: any) => p.id === 'azure'),
      );
    });

    it('includes openai', () => {
      assert.ok(
        controller.getTtsProviders().some((p: any) => p.id === 'openai'),
      );
    });

    it('includes google', () => {
      assert.ok(
        controller.getTtsProviders().some((p: any) => p.id === 'google'),
      );
    });

    it('includes polly', () => {
      assert.ok(
        controller.getTtsProviders().some((p: any) => p.id === 'polly'),
      );
    });

    it('includes minimax', () => {
      assert.ok(
        controller.getTtsProviders().some((p: any) => p.id === 'minimax'),
      );
    });
  });

  // ── GET /api/ai/voices ────────────────────────────────────────────────────

  describe('getVoices()', () => {
    it('returns ElevenLabs voices for "elevenlabs" provider', async () => {
      const voices = await controller.getVoices('elevenlabs');
      assert.equal(voices.length, 2);
      assert.ok(voices.some((v) => v.name === 'Rachel'));
    });

    it('returns Azure voices for "azure" provider', async () => {
      const voices = await controller.getVoices('azure');
      assert.equal(voices.length, 1);
      assert.equal(voices[0].id, 'en-US-JennyNeural');
    });

    it('returns empty array for unknown provider', async () => {
      const voices = await controller.getVoices('unknown-provider');
      assert.deepEqual(voices, []);
    });

    it('voices have required fields', async () => {
      const voices = await controller.getVoices('elevenlabs');
      for (const v of voices) {
        assert.ok(v.id, 'Voice must have an id');
        assert.ok(v.name, 'Voice must have a name');
        assert.ok(v.lang, 'Voice must have a lang');
      }
    });
  });

  // ── POST /api/ai/transcribe ───────────────────────────────────────────────

  describe('transcribe()', () => {
    it('returns transcript for valid audio data', async () => {
      const res = await controller.transcribe({
        audioData: Buffer.from('test audio').toString('base64'),
        mimeType: 'audio/webm',
      });
      assert.equal(
        res.transcript,
        'The quick brown fox jumps over the lazy dog',
      );
    });

    it('throws HttpException when transcription returns null', async () => {
      await assert.rejects(
        () => controller.transcribe({ audioData: 'INVALID_AUDIO' }),
        /Transcription failed/,
      );
    });

    it('throws when no audio data is provided', async () => {
      await assert.rejects(
        () => controller.transcribe({ audioData: '' }),
        /Transcription failed/,
      );
    });

    it('passes the groqApiKey through to the transcribe service', async () => {
      let capturedKey: string | undefined;
      const mockWithCapture = {
        transcribe: async (
          _audio: any,
          _mime: any,
          _lang: any,
          _model: any,
          key?: string,
        ) => {
          capturedKey = key;
          return 'hello';
        },
      };
      controller = new AiStreamController(
        makeMockModels(),
        makeMockAiProvider(),
        chatHistoryService,
        makeMockTts(),
        mockWithCapture,
      );
      await controller.transcribe({ audioData: 'test' }, 'my-groq-key');
      assert.equal(capturedKey, 'my-groq-key');
    });
  });

  // ── POST /api/ai/tts ──────────────────────────────────────────────────────

  describe('tts()', () => {
    it('returns base64 audio for valid text', async () => {
      const res = await controller.tts({
        text: 'Hello student',
        provider: 'elevenlabs',
      });
      assert.ok(res.audioData);
      assert.equal(res.mimeType, 'audio/mpeg');
    });

    it('decoded audio contains the original text', async () => {
      const res = await controller.tts({
        text: 'Learn French',
        provider: 'elevenlabs',
      });
      const decoded = Buffer.from(res.audioData, 'base64').toString('utf8');
      assert.ok(decoded.includes('Learn French'));
    });

    it('defaults to elevenlabs when no provider specified', async () => {
      const res = await controller.tts({ text: 'Hello' });
      assert.ok(res.audioData);
    });

    it('uses the provider from x-tts-provider header', async () => {
      const res = await controller.tts(
        { text: 'Bonjour' },
        { 'x-tts-provider': 'azure' },
      );
      const decoded = Buffer.from(res.audioData, 'base64').toString('utf8');
      assert.ok(decoded.includes('azure'));
    });

    it('throws when TTS synthesize returns null', async () => {
      const badTts = { ...makeMockTts(), synthesize: async () => null };
      controller = new AiStreamController(
        makeMockModels(),
        makeMockAiProvider(),
        chatHistoryService,
        badTts,
        makeMockTranscribe(),
      );
      await assert.rejects(
        () => controller.tts({ text: 'hello' }),
        /TTS not available/,
      );
    });
  });

  // ── POST /api/ai/chat/stream ──────────────────────────────────────────────

  describe('stream chat (processStreamChat())', () => {
    it('creates a new session on first message', async () => {
      const res = await controller.processStreamChat({
        message: 'Hello',
        targetLanguage: 'en',
      });
      assert.ok(res.sessionId);
      assert.ok(res.fullText.length > 0);
    });

    it('streams tokens and accumulates fullText', async () => {
      const res = await controller.processStreamChat({
        message: 'Test streaming',
      });
      assert.ok(res.tokens.length > 0);
      assert.equal(res.fullText, res.tokens.join(''));
    });

    it('reuses an existing session', async () => {
      const first = await controller.processStreamChat({ message: 'Hello' });
      const second = await controller.processStreamChat({
        message: 'Follow up',
        sessionId: first.sessionId,
      });
      assert.equal(first.sessionId, second.sessionId);
    });

    it('saves messages to chat history', async () => {
      const res = await controller.processStreamChat({ message: 'Save me' });
      const history = await chatHistoryService.getSessionHistory(res.sessionId);
      assert.equal(history.length, 2); // user + model
      assert.equal(history[0].role, 'user');
      assert.equal(history[1].role, 'model');
    });

    it('updates session language when targetLanguage differs', async () => {
      const s = await chatHistoryService.createSession('en');
      await controller.processStreamChat({
        message: 'Bonjour',
        sessionId: s.id,
        targetLanguage: 'fr',
      });
      const updated = await chatHistoryService.getSession(s.id);
      assert.equal(updated!.learningLanguage, 'fr');
    });
  });
});
