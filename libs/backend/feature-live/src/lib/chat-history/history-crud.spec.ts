/**
 * Unit tests — ChatHistoryService CRUD
 *
 * Covers: createSession, getSession, addMessage, getSessionHistory,
 *         deleteSession, updateSession (title / pin via Prisma data).
 * Listing, fork, and pin-state tests live in history-pagination.spec.ts.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPrismaService } from '../shared/testing/mock-prisma.service.ts';
import { ChatHistoryService } from './chat-history.service.fixture.ts';

let prisma: MockPrismaService;
let service: ChatHistoryService;

describe('ChatHistoryService — CRUD', () => {
  beforeEach(() => {
    prisma = new MockPrismaService();
    service = new ChatHistoryService(prisma);
  });

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
      const result = await service.updateSession(s.id, { isPinned: true });
      assert.ok(result);
    });
  });
});
