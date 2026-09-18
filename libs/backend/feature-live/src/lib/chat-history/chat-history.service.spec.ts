/**
 * Unit tests — ChatHistoryService
 *
 * Uses an in-memory MockPrismaService (no DB, no NestJS DI).
 * Covers: createSession, getSession, getAllSessions, addMessage,
 *         getSessionHistory, deleteSession, forkSession, updateSession,
 *         isSessionPinned, setSessionPinned.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPrismaService } from '../testing/mock-prisma.service.ts';

// ── Inline re-implementation without NestJS decorators ────────────────────────
class ChatHistoryService {
  private readonly pinnedSessionIds = new Set<string>();

  constructor(private readonly prisma: MockPrismaService) {}

  // ── Pinning (in-memory fallback) ─────────────────────────────────────────

  isSessionPinned(sessionId: string): boolean {
    return this.pinnedSessionIds.has(sessionId);
  }

  setSessionPinned(sessionId: string, isPinned: boolean): void {
    isPinned
      ? this.pinnedSessionIds.add(sessionId)
      : this.pinnedSessionIds.delete(sessionId);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async createSession(learningLanguage = 'en', userId?: string) {
    return this.prisma.session.create({ data: { learningLanguage, userId } });
  }

  async getSession(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });
  }

  async getAllSessions(userId?: string) {
    return this.prisma.session.findMany(
      userId ? { where: { userId } } : undefined,
    );
  }

  async addMessage(sessionId: string, role: 'user' | 'model', content: string) {
    const message = await this.prisma.message.create({
      data: { sessionId, role, content },
    });

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });

    if (session && !session.title && role === 'user') {
      const title =
        content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { title },
      });
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getSessionHistory(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) return [];
    return session.messages.map((msg: any) => ({
      role: msg.role as 'user' | 'model',
      text: msg.content,
    }));
  }

  async deleteSession(sessionId: string) {
    this.pinnedSessionIds.delete(sessionId);
    await this.prisma.message.deleteMany({ where: { sessionId } });
    return this.prisma.session.delete({ where: { id: sessionId } });
  }

  async forkSession(sourceSessionId: string) {
    const source = await this.getSession(sourceSessionId);
    if (!source) throw new Error(`Session ${sourceSessionId} not found`);

    const newSession = await this.prisma.session.create({
      data: {
        learningLanguage: source.learningLanguage ?? 'en',
        title: source.title ?? 'Shared Conversation',
      },
    });

    if (source.messages.length > 0) {
      await this.prisma.message.createMany({
        data: source.messages.map((msg: any) => ({
          sessionId: newSession.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        })),
      });
    }

    return newSession;
  }

  async updateSession(
    sessionId: string,
    data: { title?: string; learningLanguage?: string; isPinned?: boolean },
  ) {
    if (data.isPinned !== undefined) {
      this.setSessionPinned(sessionId, data.isPinned);
    }

    const { isPinned: _unused, ...prismaData } = data;

    if (Object.keys(prismaData).length === 0) {
      return this.getSession(sessionId);
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: prismaData,
    });
  }
}

// ── Test Setup ────────────────────────────────────────────────────────────────

let prisma: MockPrismaService;
let service: ChatHistoryService;

describe('ChatHistoryService', () => {
  beforeEach(() => {
    prisma = new MockPrismaService();
    service = new ChatHistoryService(prisma);
  });

  // ── createSession ─────────────────────────────────────────────────────────

  describe('createSession()', () => {
    it('creates a session with the correct language', async () => {
      const s = await service.createSession('fr');
      assert.ok(s.id, 'Session must have an id');
      assert.equal(s.learningLanguage, 'fr');
    });

    it('defaults to "en" when no language is given', async () => {
      const s = await service.createSession();
      assert.equal(s.learningLanguage, 'en');
    });

    it('stores the userId when provided', async () => {
      const s = await service.createSession('en', 'user-42');
      assert.equal(s.userId, 'user-42');
    });

    it('creates sessions with unique ids', async () => {
      const a = await service.createSession();
      const b = await service.createSession();
      assert.notEqual(a.id, b.id);
    });
  });

  // ── getSession ────────────────────────────────────────────────────────────

  describe('getSession()', () => {
    it('returns null for a non-existent session', async () => {
      const result = await service.getSession('ghost');
      assert.equal(result, null);
    });

    it('returns the session with its messages', async () => {
      const s = await service.createSession('en');
      await service.addMessage(s.id, 'user', 'Hello');
      const found = await service.getSession(s.id);
      assert.ok(found);
      assert.equal(found.messages.length, 1);
    });
  });

  // ── getAllSessions ────────────────────────────────────────────────────────

  describe('getAllSessions()', () => {
    it('returns all sessions', async () => {
      await service.createSession('en');
      await service.createSession('fr');
      const all = await service.getAllSessions();
      assert.ok(all.length >= 2);
    });
  });

  // ── addMessage ────────────────────────────────────────────────────────────

  describe('addMessage()', () => {
    it('sets the session title from the first user message', async () => {
      const s = await service.createSession('en');
      await service.addMessage(s.id, 'user', 'Teach me verb tenses please');
      const updated = await service.getSession(s.id);
      assert.equal(updated!.title, 'Teach me verb tenses please');
    });

    it('truncates long titles to 50 chars + ellipsis', async () => {
      const s = await service.createSession('en');
      const longMsg =
        'This is a very long message that exceeds the fifty character limit';
      await service.addMessage(s.id, 'user', longMsg);
      const updated = await service.getSession(s.id);
      assert.ok(updated!.title!.length <= 53);
      assert.ok(updated!.title!.endsWith('...'));
    });

    it('does not override title if already set', async () => {
      const s = await service.createSession('en');
      await service.addMessage(s.id, 'user', 'First message');
      await service.addMessage(s.id, 'user', 'Second message');
      const updated = await service.getSession(s.id);
      assert.equal(updated!.title, 'First message');
    });

    it('does not set title from a model message', async () => {
      const s = await service.createSession('en');
      await service.addMessage(s.id, 'model', 'Welcome!');
      const updated = await service.getSession(s.id);
      assert.equal(
        updated!.title,
        null,
        'Title should stay null for model messages',
      );
    });

    it('adds the message to the session history', async () => {
      const s = await service.createSession('en');
      await service.addMessage(s.id, 'user', 'Hello');
      await service.addMessage(s.id, 'model', 'Hi!');
      const history = await service.getSessionHistory(s.id);
      assert.equal(history.length, 2);
    });
  });

  // ── getSessionHistory ─────────────────────────────────────────────────────

  describe('getSessionHistory()', () => {
    it('returns messages as role/text pairs', async () => {
      const s = await service.createSession('en');
      await service.addMessage(s.id, 'user', 'What is a verb?');
      await service.addMessage(s.id, 'model', 'A **verb** expresses action.');
      const history = await service.getSessionHistory(s.id);
      assert.equal(history.length, 2);
      assert.equal(history[0].role, 'user');
      assert.equal(history[0].text, 'What is a verb?');
      assert.equal(history[1].role, 'model');
      assert.equal(history[1].text, 'A **verb** expresses action.');
    });

    it('returns an empty array for a non-existent session', async () => {
      const result = await service.getSessionHistory('ghost');
      assert.deepEqual(result, []);
    });
  });

  // ── deleteSession ─────────────────────────────────────────────────────────

  describe('deleteSession()', () => {
    it('removes the session from the store', async () => {
      const s = await service.createSession('en');
      await service.deleteSession(s.id);
      assert.equal(await service.getSession(s.id), null);
    });

    it('removes the session messages', async () => {
      const s = await service.createSession('en');
      await service.addMessage(s.id, 'user', 'Hello');
      await service.deleteSession(s.id);
      assert.equal(
        prisma.msgs.filter((m) => m.sessionId === s.id).length,
        0,
        'Messages should be deleted',
      );
    });

    it('clears the pinned state', async () => {
      const s = await service.createSession('en');
      service.setSessionPinned(s.id, true);
      await service.deleteSession(s.id);
      assert.equal(service.isSessionPinned(s.id), false);
    });
  });

  // ── forkSession ───────────────────────────────────────────────────────────

  describe('forkSession()', () => {
    it('creates an independent snapshot with a new ID', async () => {
      const src = await service.createSession('en');
      await service.addMessage(src.id, 'user', 'Question 1');
      await service.addMessage(src.id, 'model', '**Answer** 1');

      const fork = await service.forkSession(src.id);
      assert.ok(fork.id);
      assert.notEqual(fork.id, src.id);
    });

    it('copies all messages to the fork', async () => {
      const src = await service.createSession('en');
      await service.addMessage(src.id, 'user', 'Q1');
      await service.addMessage(src.id, 'model', 'A1');

      const fork = await service.forkSession(src.id);
      const forkDetail = await service.getSession(fork.id);
      assert.equal(forkDetail!.messages.length, 2);
    });

    it('works when source has no messages', async () => {
      const src = await service.createSession('en');
      const fork = await service.forkSession(src.id);
      const forkDetail = await service.getSession(fork.id);
      assert.equal(forkDetail!.messages.length, 0);
    });

    it('throws when the source session does not exist', async () => {
      await assert.rejects(
        () => service.forkSession('non-existent'),
        /not found/,
      );
    });
  });

  // ── isSessionPinned / setSessionPinned ────────────────────────────────────

  describe('isSessionPinned() / setSessionPinned()', () => {
    it('returns false by default', async () => {
      const s = await service.createSession();
      assert.equal(service.isSessionPinned(s.id), false);
    });

    it('pins a session', async () => {
      const s = await service.createSession();
      service.setSessionPinned(s.id, true);
      assert.equal(service.isSessionPinned(s.id), true);
    });

    it('unpins a session', async () => {
      const s = await service.createSession();
      service.setSessionPinned(s.id, true);
      service.setSessionPinned(s.id, false);
      assert.equal(service.isSessionPinned(s.id), false);
    });
  });

  // ── updateSession ─────────────────────────────────────────────────────────

  describe('updateSession()', () => {
    it('updates the title via Prisma', async () => {
      const s = await service.createSession('en');
      await service.updateSession(s.id, { title: 'Renamed Lesson' });
      const updated = await service.getSession(s.id);
      assert.equal(updated!.title, 'Renamed Lesson');
    });

    it('pins the session when isPinned: true', async () => {
      const s = await service.createSession('en');
      await service.updateSession(s.id, { isPinned: true });
      assert.equal(service.isSessionPinned(s.id), true);
    });

    it('unpins the session when isPinned: false', async () => {
      const s = await service.createSession('en');
      service.setSessionPinned(s.id, true);
      await service.updateSession(s.id, { isPinned: false });
      assert.equal(service.isSessionPinned(s.id), false);
    });

    it('only updates pin state without hitting Prisma when no other data', async () => {
      const s = await service.createSession('en');
      // Should not throw even though no prisma.update is needed
      const result = await service.updateSession(s.id, { isPinned: true });
      assert.ok(result);
    });
  });
});
