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

describe('AiStreamController — transcribe/tts', () => {
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
});
