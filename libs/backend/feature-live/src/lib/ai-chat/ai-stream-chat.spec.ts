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

describe('AiStreamController — stream chat', () => {
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
