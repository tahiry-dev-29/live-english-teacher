import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ChatHistoryService,
  LiveResolver,
  MockPrismaService,
} from './live-resolver.spec-fixtures.ts';

let prisma: MockPrismaService;
let chatHistoryService: ChatHistoryService;
let resolver: LiveResolver;
let mockGemini: any;
let mockAiProvider: any;

describe('LiveResolver — chat', () => {
  beforeEach(() => {
    prisma = new MockPrismaService();
    chatHistoryService = new ChatHistoryService(prisma);
    mockGemini = {
      getGeminiTtsAudio: async () => ({
        audioData: 'b64audio==',
        mimeType: 'audio/mpeg',
      }),
    };
    mockAiProvider = {
      generateText: async () => '### AI Response\n\n- Point 1\n- Point 2',
    };
    resolver = new LiveResolver(mockGemini, mockAiProvider, chatHistoryService);
  });

  describe('hello()', () => {
    it('returns the greeting string', () => {
      assert.equal(resolver.hello(), 'Hello World!');
    });
  });

  // ── getSessions ───────────────────────────────────────────────────────────

  describe('chat()', () => {
    it('creates a new session and returns AI markdown response', async () => {
      const res = await resolver.chat('Teach me French verbs');
      assert.ok(res.sessionId);
      assert.ok(res.text.includes('### AI Response'));
    });

    it('saves user and model messages to the session history', async () => {
      const res = await resolver.chat('Hello');
      const history = await chatHistoryService.getSessionHistory(res.sessionId);
      assert.equal(history.length, 2);
      assert.equal(history[0].role, 'user');
      assert.equal(history[1].role, 'model');
    });

    it('reuses an existing session', async () => {
      const first = await resolver.chat('First message');
      const second = await resolver.chat('Second message', first.sessionId);
      assert.equal(first.sessionId, second.sessionId);
      const history = await chatHistoryService.getSessionHistory(
        first.sessionId,
      );
      assert.equal(history.length, 4); // 2 user + 2 model
    });

    it('creates a new session if sessionId refers to non-existent session', async () => {
      const res = await resolver.chat('Hello', 'ghost-id');
      assert.ok(res.sessionId);
      assert.notEqual(res.sessionId, 'ghost-id');
    });

    it('includes audioData in the response from Gemini TTS', async () => {
      const res = await resolver.chat('Hello');
      assert.equal(res.audioData, 'b64audio==');
      assert.equal(res.mimeType, 'audio/mpeg');
    });

    it('gracefully continues if Gemini TTS throws', async () => {
      mockGemini.getGeminiTtsAudio = async () => {
        throw new Error('TTS down');
      };
      resolver = new LiveResolver(
        mockGemini,
        mockAiProvider,
        chatHistoryService,
      );
      const res = await resolver.chat('Hello');
      assert.ok(res.text);
      assert.equal(res.audioData, undefined);
    });
  });

  // ── generateAudio ─────────────────────────────────────────────────────────

  describe('generateAudio()', () => {
    it('returns audio data for valid text', async () => {
      const result = await resolver.generateAudio('Hello student');
      assert.ok(result);
      assert.equal(result!.mimeType, 'audio/mpeg');
    });

    it('returns null when Gemini TTS returns null', async () => {
      mockGemini.getGeminiTtsAudio = async () => null;
      resolver = new LiveResolver(
        mockGemini,
        mockAiProvider,
        chatHistoryService,
      );
      const result = await resolver.generateAudio('Hello');
      assert.equal(result, null);
    });
});
});
