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

describe('LiveResolver — history', () => {
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

  describe('getSessions()', () => {
    it('returns all sessions', async () => {
      await chatHistoryService.createSession('en');
      await chatHistoryService.createSession('fr');
      const sessions = await resolver.getSessions();
      assert.ok(sessions.length >= 2);
    });

    it('returns sessions with correct isPinned state', async () => {
      const s1 = await chatHistoryService.createSession('en');
      const s2 = await chatHistoryService.createSession('fr');
      chatHistoryService.setSessionPinned(s1.id, true);

      const sessions = await resolver.getSessions();
      const found1 = sessions.find((s: any) => s.id === s1.id)!;
      const found2 = sessions.find((s: any) => s.id === s2.id)!;
      assert.equal(found1.isPinned, true);
      assert.equal(found2.isPinned, false);
    });

    it('returns "New Conversation" as default title', async () => {
      await chatHistoryService.createSession('en');
      const sessions = await resolver.getSessions();
      assert.ok(sessions.some((s: any) => s.title === 'New Conversation'));
    });

    it('returns ISO string for dates', async () => {
      await chatHistoryService.createSession();
      const sessions = await resolver.getSessions();
      assert.ok(!isNaN(Date.parse(sessions[0].createdAt)));
    });
  });

  // ── getSession ────────────────────────────────────────────────────────────

  describe('getSession()', () => {
    it('returns session detail with messages', async () => {
      const s = await chatHistoryService.createSession('en');
      await chatHistoryService.addMessage(s.id, 'user', 'What is a verb?');
      await chatHistoryService.addMessage(
        s.id,
        'model',
        'A verb expresses action.',
      );

      const detail = await resolver.getSession(s.id);
      assert.ok(detail);
      assert.equal(detail.messages.length, 2);
    });

    it('reflects the isPinned state', async () => {
      const s = await chatHistoryService.createSession('en');
      chatHistoryService.setSessionPinned(s.id, true);
      const detail = await resolver.getSession(s.id);
      assert.equal(detail!.isPinned, true);
    });

    it('returns null for a non-existent session', async () => {
      const result = await resolver.getSession('ghost');
      assert.equal(result, null);
    });
  });

  // ── sessionMessages ───────────────────────────────────────────────────────

  describe('sessionMessages()', () => {
    it('returns messages for a session', async () => {
      const s = await chatHistoryService.createSession('en');
      await chatHistoryService.addMessage(s.id, 'user', 'Hi');
      await chatHistoryService.addMessage(s.id, 'model', 'Hello!');
      const msgs = await resolver.sessionMessages(s.id);
      assert.equal(msgs.length, 2);
    });

    it('returns empty array for non-existent session', async () => {
      const msgs = await resolver.sessionMessages('ghost');
      assert.deepEqual(msgs, []);
    });
  });

  // ── chat ──────────────────────────────────────────────────────────────────

  describe('updateSession()', () => {
    it('updates title and isPinned', async () => {
      const s = await chatHistoryService.createSession('en');
      const updated = await resolver.updateSession({
        sessionId: s.id,
        title: 'My French Lesson',
        isPinned: true,
      });
      assert.ok(updated);
      assert.equal(updated.title, 'My French Lesson');
      assert.equal(updated.isPinned, true);
      assert.equal(chatHistoryService.isSessionPinned(s.id), true);
    });

    it('unpins a session', async () => {
      const s = await chatHistoryService.createSession('en');
      chatHistoryService.setSessionPinned(s.id, true);
      await resolver.updateSession({ sessionId: s.id, isPinned: false });
      assert.equal(chatHistoryService.isSessionPinned(s.id), false);
    });
  });

  // ── deleteSession ─────────────────────────────────────────────────────────

  describe('deleteSession()', () => {
    it('deletes the session and returns true', async () => {
      const s = await chatHistoryService.createSession('en');
      const result = await resolver.deleteSession(s.id);
      assert.equal(result, true);
      assert.equal(await chatHistoryService.getSession(s.id), null);
    });

    it('returns false for a non-existent session', async () => {
      const result = await resolver.deleteSession('ghost-id');
      assert.equal(result, false);
    });
  });

  // ── forkSession ───────────────────────────────────────────────────────────

  describe('forkSession()', () => {
    it('creates a forked session with a different ID', async () => {
      const s = await chatHistoryService.createSession('en');
      await chatHistoryService.addMessage(s.id, 'user', 'Original message');

      const fork = await resolver.forkSession(s.id);
      assert.ok(fork.id);
      assert.notEqual(fork.id, s.id);
      assert.ok(fork.title);
      assert.ok(!isNaN(Date.parse(fork.createdAt)));
    });
});
});
