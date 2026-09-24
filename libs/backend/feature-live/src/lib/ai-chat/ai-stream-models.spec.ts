import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ChatHistoryService,
  AiStreamController,
  MockPrismaService,
  makeMockModels,
  makeMockTts,
  makeMockTranscribe,
  makeMockAiProvider,
} from './ai-stream.spec-fixtures.ts';

let prisma: MockPrismaService;
let chatHistoryService: ChatHistoryService;
let controller: AiStreamController;

describe('AiStreamController — models/voices', () => {
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
});
