import { Injectable } from '@nestjs/common';
import { PrismaService } from '@live-languages-teacher/data-access-prisma';
import type { OwnerScope } from './user-memory.service';
import { DEFAULT_PROMPT_TAGS } from './prompt-tags.defaults';

export interface CustomTagInput {
  name: string;
  description: string;
}

/**
 * Server-side prompt tags (task 87, enterprise: DB is the source of truth).
 * Built-ins come from prompt-tags.defaults.ts; only custom tags are stored.
 */
@Injectable()
export class PromptTagService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(scope: OwnerScope) {
    return scope.userId
      ? { userId: scope.userId }
      : { deviceKey: scope.deviceKey };
  }

  async list(scope: OwnerScope) {
    const custom = await this.prisma.promptTag.findMany({
      where: this.scopeWhere(scope),
      orderBy: { name: 'asc' },
    });
    return { defaults: DEFAULT_PROMPT_TAGS, custom };
  }

  async add(scope: OwnerScope, input: CustomTagInput) {
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
    const taken = await this.prisma.promptTag.findFirst({
      where: { ...this.scopeWhere(scope), name },
    });
    if (taken) throw new Error(`Tag "${name}" already exists.`);
    return this.prisma.promptTag.create({
      data: {
        userId: scope.userId,
        deviceKey: scope.deviceKey,
        name,
        description,
        systemPrompt: description,
      },
    });
  }

  async update(scope: OwnerScope, name: string, description: string) {
    const clean = description.trim();
    if (!clean) throw new Error('Tag description must not be empty.');
    const result = await this.prisma.promptTag.updateMany({
      where: { ...this.scopeWhere(scope), name: name.toLowerCase() },
      data: { description: clean, systemPrompt: clean },
    });
    if (result.count === 0) throw new Error(`Tag "${name}" not found.`);
    return result;
  }

  remove(scope: OwnerScope, name: string) {
    return this.prisma.promptTag.deleteMany({
      where: { ...this.scopeWhere(scope), name: name.toLowerCase() },
    });
  }

  reset(scope: OwnerScope) {
    return this.prisma.promptTag.deleteMany({
      where: this.scopeWhere(scope),
    });
  }
}
