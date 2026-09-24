/**
 * Unit tests — ChatHistoryService listing / fork / pin
 *
 * Covers: getAllSessions, forkSession, isSessionPinned / setSessionPinned.
 * CRUD coverage lives in history-crud.spec.ts.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPrismaService } from '../shared/testing/mock-prisma.service.ts';
import { ChatHistoryService } from './chat-history.service.fixture.ts';

let prisma: MockPrismaService;
let service: ChatHistoryService;

describe('ChatHistoryService — pagination / pin / fork', () => {
  beforeEach(() => {
    prisma = new MockPrismaService();
    service = new ChatHistoryService(prisma);
  });

  describe('getAllSessions()', () => {
    it('returns all sessions', async () => {
      await service.createSession('en');
      await service.createSession('fr');
      const all = await service.getAllSessions();
      assert.ok(all.length >= 2);
    });
  });

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
});
