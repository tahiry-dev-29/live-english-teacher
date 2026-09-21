/**
 * Unit tests — PromptTagService (task 87, enterprise DB).
 * Inline re-implementation without NestJS decorators (repo pattern).
 * Covers: defaults always listed, custom CRUD, built-in protection,
 *         duplicate rejection, scoped isolation, reset.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPrismaService } from '../testing/mock-prisma.service.ts';
import { DEFAULT_PROMPT_TAGS } from './prompt-tags.defaults.ts';

class PromptTagService {
  constructor(private readonly prisma: MockPrismaService) {}

  private scopeWhere(scope: { userId?: string; deviceKey: string }) {
    return scope.userId
      ? { userId: scope.userId }
      : { deviceKey: scope.deviceKey };
  }

  async list(scope: { userId?: string; deviceKey: string }) {
    const custom = await (this.prisma as any).promptTag.findMany({
      where: this.scopeWhere(scope),
      orderBy: { name: 'asc' },
    });
    return { defaults: DEFAULT_PROMPT_TAGS, custom };
  }

  async add(
    scope: { userId?: string; deviceKey: string },
    input: { name: string; description: string },
  ) {
    const name = input.name
      .trim()
      .toLowerCase()
      .replace(/^#+/, '')
      .replace(/\s+/g, '-');
    const description = input.description.trim();
    if (!name || !description)
      throw new Error('Tag name and description are required.');
    if (DEFAULT_PROMPT_TAGS.some((t) => t.name === name)) {
      throw new Error(`Tag "${name}" is a built-in tag.`);
    }
    const taken = await (this.prisma as any).promptTag.findFirst({
      where: { ...this.scopeWhere(scope), name },
    });
    if (taken) throw new Error(`Tag "${name}" already exists.`);
    return (this.prisma as any).promptTag.create({
      data: {
        userId: scope.userId,
        deviceKey: scope.deviceKey,
        name,
        description,
        systemPrompt: description,
      },
    });
  }

  async update(
    scope: { userId?: string; deviceKey: string },
    name: string,
    description: string,
  ) {
    const clean = description.trim();
    if (!clean) throw new Error('Tag description must not be empty.');
    const result = await (this.prisma as any).promptTag.updateMany({
      where: { ...this.scopeWhere(scope), name: name.toLowerCase() },
      data: { description: clean, systemPrompt: clean },
    });
    if (result.count === 0) throw new Error(`Tag "${name}" not found.`);
    return result;
  }

  remove(scope: { userId?: string; deviceKey: string }, name: string) {
    return (this.prisma as any).promptTag.deleteMany({
      where: { ...this.scopeWhere(scope), name: name.toLowerCase() },
    });
  }

  reset(scope: { userId?: string; deviceKey: string }) {
    return (this.prisma as any).promptTag.deleteMany({
      where: this.scopeWhere(scope),
    });
  }
}

describe('PromptTagService', () => {
  let prisma: MockPrismaService;
  let service: PromptTagService;
  const scope = { deviceKey: 'dev-1' };

  beforeEach(() => {
    prisma = new MockPrismaService();
    prisma.reset();
    service = new PromptTagService(prisma);
  });

  it('always lists the 15 built-in defaults', async () => {
    const { defaults, custom } = await service.list(scope);
    assert.equal(defaults.length, 15);
    assert.equal(custom.length, 0);
  });

  it('adds a normalized custom tag', async () => {
    const created = await service.add(scope, {
      name: '#My Tag',
      description: 'd',
    });
    assert.equal(created.name, 'my-tag');
    assert.equal((await service.list(scope)).custom.length, 1);
  });

  it('rejects built-ins and duplicates', async () => {
    await assert.rejects(
      () => service.add(scope, { name: 'exam', description: 'x' }),
      /built-in/,
    );
    await service.add(scope, { name: 'foo', description: 'x' });
    await assert.rejects(
      () => service.add(scope, { name: 'foo', description: 'y' }),
      /already exists/,
    );
  });

  it('updates, removes and resets within scope', async () => {
    await service.add(scope, { name: 'foo', description: 'x' });
    await service.update(scope, 'foo', 'better');
    assert.equal((await service.list(scope)).custom[0].description, 'better');
    await service.remove(scope, 'foo');
    assert.equal((await service.list(scope)).custom.length, 0);
    await service.add(scope, { name: 'a', description: 'x' });
    await service.add({ deviceKey: 'other' }, { name: 'b', description: 'y' });
    await service.reset(scope);
    assert.equal((await service.list(scope)).custom.length, 0);
    assert.equal((await service.list({ deviceKey: 'other' })).custom.length, 1);
  });

  it('rejects unknown updates', async () => {
    await assert.rejects(() => service.update(scope, 'nope', 'x'), /not found/);
  });
});
