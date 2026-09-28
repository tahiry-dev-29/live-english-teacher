/**
 * Unit tests — UserMemoryService (task 105, real service + MockPrisma).
 * The service is imported for real (decorators + tsconfig aliases resolve
 * through the `test:backend:unit` swc/alias loader chain) — no inline
 * re-implementation. Covers: trim/empty, global vs model scoping,
 * user-over-device ownership, atomic quota (incl. concurrent adds),
 * scoped update/remove/clear, buildPromptContext merge.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPrismaService } from '../shared/testing/mock-prisma.service.ts';
import {
  MemoryQuotaError,
  UserMemoryService,
  type OwnerScope,
} from './user-memory.service.ts';
import type { PrismaService } from '@live-languages-teacher/data-access-prisma';

const guest = (
  deviceKey = 'dev-1',
  modelScope: string | null = null,
): OwnerScope => ({
  deviceKey,
  modelScope,
});
const owner = (
  userId: string,
  modelScope: string | null = null,
): OwnerScope => ({
  userId,
  deviceKey: 'any-device',
  modelScope,
});

describe('UserMemoryService', () => {
  let prisma: MockPrismaService;
  let service: UserMemoryService;

  beforeEach(() => {
    prisma = new MockPrismaService();
    prisma.reset();
    service = new UserMemoryService(prisma as unknown as PrismaService);
  });

  it('adds a trimmed global memory and lists it', async () => {
    const created = await service.add(guest(), '  likes football  ');
    assert.equal(created.text, 'likes football');
    assert.equal(created.modelScope, null);
    const list = await service.list(guest());
    assert.equal(list.length, 1);
  });

  it('rejects empty text', async () => {
    await assert.rejects(
      () => service.add(guest(), '   '),
      /must not be empty/,
    );
  });

  it('scopes memories per model: global list hides model rows', async () => {
    await service.add(guest(), 'global fact');
    await service.add(guest('dev-1', 'gemini-2.5-pro'), 'model fact');

    const globalOnly = await service.list(guest());
    assert.equal(globalOnly.length, 1);
    assert.equal(globalOnly[0].text, 'global fact');

    const merged = await service.list(guest('dev-1', 'gemini-2.5-pro'));
    assert.equal(merged.length, 2);

    const foreign = await service.list(guest('dev-1', 'openai:gpt-4o'));
    assert.equal(foreign.length, 1);
    assert.equal(foreign[0].text, 'global fact');
  });

  it('follows the user, not the device', async () => {
    await service.add(
      { userId: 'u1', deviceKey: 'browser-a', modelScope: null },
      'cross-browser',
    );
    const seen = await service.list({
      userId: 'u1',
      deviceKey: 'browser-b',
      modelScope: null,
    });
    assert.equal(seen.length, 1);
    const guestView = await service.list(guest('browser-a'));
    assert.equal(guestView.length, 0);
  });

  it('enforces the 50-memory quota without growing past it', async () => {
    for (let i = 0; i < UserMemoryService.MAX_MEMORIES; i += 1) {
      await service.add(guest(), `m${i}`);
    }
    await assert.rejects(
      () => service.add(guest(), 'one too many'),
      (error: unknown) => {
        assert.ok(error instanceof MemoryQuotaError);
        assert.equal(error.used, 50);
        assert.equal(error.max, 50);
        return true;
      },
    );
    assert.equal((await service.list(guest())).length, 50);
  });

  it('keeps concurrent adds within quota (atomic count + create)', async () => {
    const created = await Promise.all(
      Array.from({ length: 5 }, (_, i) => service.add(guest(), `c${i}`)),
    );
    assert.equal(created.length, 5);
    assert.equal(new Set(created.map((m) => m.id)).size, 5);
    assert.equal((await service.list(guest())).length, 5);
  });

  it('updates only within its own scope', async () => {
    const created = await service.add(guest(), 'old');
    await service.update(guest(), created.id, 'new');
    const list = await service.list(guest());
    assert.equal(list[0].text, 'new');
    await assert.rejects(
      () => service.update(guest('other'), created.id, 'x'),
      /not found/,
    );

    const scoped = await service.add(
      guest('dev-1', 'gemini-2.5-pro'),
      'scoped old',
    );
    await service.update(
      guest('dev-1', 'gemini-2.5-pro'),
      scoped.id,
      'scoped new',
    );
    await assert.rejects(
      () => service.update(guest(), scoped.id, 'x'),
      /not found/,
    );
    await assert.rejects(
      () => service.update(guest('dev-1', 'openai:gpt-4o'), scoped.id, 'x'),
      /not found/,
    );
  });

  it('removes and clears scoped rows only', async () => {
    const a = await service.add(guest(), 'a');
    await service.add(guest('dev-1', 'openai:gpt-4o'), 'b');
    await service.remove(guest(), a.id);
    assert.equal((await service.list(guest())).length, 0);
    assert.equal(
      (await service.list(guest('dev-1', 'openai:gpt-4o'))).length,
      1,
    );
    await service.clear(guest());
    assert.equal((await service.list(guest())).length, 0);
    const remaining = await service.list(guest('dev-1', 'openai:gpt-4o'));
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].text, 'b');
  });

  it('builds prompt context from globals + current model only', async () => {
    assert.equal(await service.buildPromptContext(owner('u1')), '');
    await service.add(owner('u1'), 'prefers morning lessons');
    await service.add(owner('u1', 'gemini-2.5-pro'), 'model-only fact');
    const ctx = await service.buildPromptContext(owner('u1', 'gemini-2.5-pro'));
    assert.match(ctx, /prefers morning lessons/);
    assert.match(ctx, /model-only fact/);
    const foreign = await service.buildPromptContext(
      owner('u1', 'openai:gpt-4o'),
    );
    assert.doesNotMatch(foreign, /model-only fact/);
  });
});
