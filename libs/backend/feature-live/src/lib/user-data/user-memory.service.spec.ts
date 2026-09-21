/**
 * Unit tests — UserMemoryService (task 85, enterprise DB).
 * Inline re-implementation without NestJS decorators (repo pattern).
 * Covers: add/trim/empty, server quota 50, scoped update/remove/clear,
 *         cross-device isolation, buildContext.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPrismaService } from '../testing/mock-prisma.service.ts';

class UserMemoryService {
  static readonly MAX_MEMORIES = 50;
  constructor(private readonly prisma: MockPrismaService) {}

  private scopeWhere(scope: { userId?: string; deviceKey: string }) {
    return scope.userId
      ? { userId: scope.userId }
      : { deviceKey: scope.deviceKey };
  }

  list(scope: { userId?: string; deviceKey: string }) {
    return (this.prisma as any).userMemory.findMany({
      where: this.scopeWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });
  }

  async add(scope: { userId?: string; deviceKey: string }, text: string) {
    const clean = text.trim();
    if (!clean) throw new Error('Memory text must not be empty.');
    const count = await (this.prisma as any).userMemory.count({
      where: this.scopeWhere(scope),
    });
    if (count >= UserMemoryService.MAX_MEMORIES) {
      throw new Error('Memory is full (50/50).');
    }
    return (this.prisma as any).userMemory.create({
      data: { userId: scope.userId, deviceKey: scope.deviceKey, text: clean },
    });
  }

  async update(
    scope: { userId?: string; deviceKey: string },
    id: string,
    text: string,
  ) {
    const clean = text.trim();
    if (!clean) throw new Error('Memory text must not be empty.');
    const result = await (this.prisma as any).userMemory.updateMany({
      where: { id, ...this.scopeWhere(scope) },
      data: { text: clean },
    });
    if (result.count === 0) throw new Error(`Memory ${id} not found.`);
    return result;
  }

  remove(scope: { userId?: string; deviceKey: string }, id: string) {
    return (this.prisma as any).userMemory.deleteMany({
      where: { id, ...this.scopeWhere(scope) },
    });
  }

  clear(scope: { userId?: string; deviceKey: string }) {
    return (this.prisma as any).userMemory.deleteMany({
      where: this.scopeWhere(scope),
    });
  }

  async buildContext(scope: {
    userId?: string;
    deviceKey: string;
  }): Promise<string> {
    const list = await this.list(scope);
    if (list.length === 0) return '';
    return list.map((m: any) => `- ${m.text}`).join('\n');
  }
}

describe('UserMemoryService', () => {
  let prisma: MockPrismaService;
  let service: UserMemoryService;
  const scope = { deviceKey: 'dev-1' };

  beforeEach(() => {
    prisma = new MockPrismaService();
    prisma.reset();
    service = new UserMemoryService(prisma);
  });

  it('adds a trimmed memory and lists it', async () => {
    const created = await service.add(scope, '  likes football  ');
    assert.equal(created.text, 'likes football');
    const list = await service.list(scope);
    assert.equal(list.length, 1);
  });

  it('rejects empty text', async () => {
    await assert.rejects(() => service.add(scope, '   '), /must not be empty/);
  });

  it('enforces the 50-memory server quota', async () => {
    for (let i = 0; i < 50; i++) await service.add(scope, `m${i}`);
    await assert.rejects(() => service.add(scope, 'one too many'), /full/);
  });

  it('updates only within its own scope', async () => {
    const created = await service.add(scope, 'old');
    await service.update(scope, created.id, 'new');
    const list = await service.list(scope);
    assert.equal(list[0].text, 'new');
    await assert.rejects(
      () => service.update({ deviceKey: 'other' }, created.id, 'x'),
      /not found/,
    );
  });

  it('removes and clears scoped rows only', async () => {
    const a = await service.add(scope, 'a');
    await service.add({ deviceKey: 'other' }, 'b');
    await service.remove(scope, a.id);
    assert.equal((await service.list(scope)).length, 0);
    assert.equal((await service.list({ deviceKey: 'other' })).length, 1);
    await service.add(scope, 'c');
    await service.clear(scope);
    assert.equal((await service.list(scope)).length, 0);
    assert.equal((await service.list({ deviceKey: 'other' })).length, 1);
  });

  it('builds context lines for prompt injection', async () => {
    assert.equal(await service.buildContext(scope), '');
    await service.add(scope, 'prefers morning lessons');
    const ctx = await service.buildContext(scope);
    assert.match(ctx, /prefers morning lessons/);
  });
});
