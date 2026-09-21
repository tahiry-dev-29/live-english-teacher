import { Injectable } from '@nestjs/common';
import { PrismaService } from '@live-languages-teacher/data-access-prisma';

export interface OwnerScope {
  userId?: string;
  deviceKey: string;
}

/**
 * Server-side user memories (task 85, enterprise: DB is the source of truth).
 * Quota enforced here — the client can never exceed MAX_MEMORIES.
 */
@Injectable()
export class UserMemoryService {
  static readonly MAX_MEMORIES = 50;

  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(scope: OwnerScope) {
    return scope.userId
      ? { userId: scope.userId }
      : { deviceKey: scope.deviceKey };
  }

  list(scope: OwnerScope) {
    return this.prisma.userMemory.findMany({
      where: this.scopeWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });
  }

  async add(scope: OwnerScope, text: string) {
    const clean = text.trim();
    if (!clean) throw new Error('Memory text must not be empty.');
    const count = await this.prisma.userMemory.count({
      where: this.scopeWhere(scope),
    });
    if (count >= UserMemoryService.MAX_MEMORIES) {
      throw new Error(
        `Memory is full (${UserMemoryService.MAX_MEMORIES}/${UserMemoryService.MAX_MEMORIES}).`,
      );
    }
    return this.prisma.userMemory.create({
      data: {
        userId: scope.userId,
        deviceKey: scope.deviceKey,
        text: clean,
      },
    });
  }

  async update(scope: OwnerScope, id: string, text: string) {
    const clean = text.trim();
    if (!clean) throw new Error('Memory text must not be empty.');
    const result = await this.prisma.userMemory.updateMany({
      where: { id, ...this.scopeWhere(scope) },
      data: { text: clean },
    });
    if (result.count === 0) throw new Error(`Memory ${id} not found.`);
    return result;
  }

  remove(scope: OwnerScope, id: string) {
    return this.prisma.userMemory.deleteMany({
      where: { id, ...this.scopeWhere(scope) },
    });
  }

  clear(scope: OwnerScope) {
    return this.prisma.userMemory.deleteMany({
      where: this.scopeWhere(scope),
    });
  }

  async buildContext(scope: OwnerScope): Promise<string> {
    const list = await this.list(scope);
    if (list.length === 0) return '';
    return list.map((m) => `- ${m.text}`).join('\n');
  }
}
