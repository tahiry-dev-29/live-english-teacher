import { Injectable } from '@nestjs/common';
import { PrismaService } from '@live-languages-teacher/data-access-prisma';
import {
  buildPromptContext,
  type MemoryContextEntry,
} from './user-memory-context.util';

export interface OwnerScope {
  userId?: string;
  deviceKey: string;
  modelScope: string | null;
}

/**
 * Quota domain error (task 105): the owner already holds `used` memories.
 * Carries no HTTP concern — `toHttp()` in the validation pipe maps it to a
 * 409 with the shared `memoryQuotaReached` text.
 */
export class MemoryQuotaError extends Error {
  constructor(
    readonly used: number,
    readonly max: number,
  ) {
    super(`Memory quota reached (${used}/${max}).`);
    this.name = 'MemoryQuotaError';
  }
}

/** Prisma serialization/deadlock conflicts (P2034) are safe to retry. */
function isSerializationConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return 'code' in error && error.code === 'P2034';
}

const QUOTA_ADD_RETRIES = 2;

/**
 * Server-side user memories (task 85, task 105 model scoping).
 * DB is the source of truth. Quota enforced here — the client can never
 * exceed MAX_MEMORIES. Formatting lives in `user-memory-context.util.ts`
 * (single implementation, shared with the chat ingestion path).
 */
@Injectable()
export class UserMemoryService {
  static readonly MAX_MEMORIES = 50;

  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(scope: OwnerScope) {
    const owner = scope.userId
      ? { userId: scope.userId }
      : { userId: null, deviceKey: scope.deviceKey };
    // A request sees global memories plus the current model's own —
    // never another model's.
    return scope.modelScope
      ? {
          ...owner,
          OR: [{ modelScope: scope.modelScope }, { modelScope: null }],
        }
      : { ...owner, OR: [{ modelScope: null }] };
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
    for (let attempt = 0; ; attempt += 1) {
      try {
        // Count + insert in one serializable transaction: concurrent `add()`
        // calls cannot slip past the quota between the two statements.
        return await this.prisma.$transaction(
          async (tx) => {
            const used = await tx.userMemory.count({
              where: this.scopeWhere(scope),
            });
            if (used >= UserMemoryService.MAX_MEMORIES) {
              throw new MemoryQuotaError(used, UserMemoryService.MAX_MEMORIES);
            }
            return tx.userMemory.create({
              data: {
                userId: scope.userId,
                deviceKey: scope.deviceKey,
                modelScope: scope.modelScope,
                text: clean,
              },
            });
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        if (
          error instanceof MemoryQuotaError ||
          !isSerializationConflict(error) ||
          attempt >= QUOTA_ADD_RETRIES
        ) {
          throw error;
        }
      }
    }
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

  /** Prompt-ready context: globals + current model, formatted once. */
  async buildPromptContext(scope: OwnerScope): Promise<string> {
    const rows = await this.list(scope);
    const entries: MemoryContextEntry[] = rows.map((row) => ({
      id: row.id,
      text: row.text,
      modelScope: row.modelScope,
      updatedAt: row.updatedAt,
    }));
    return buildPromptContext(entries, scope.modelScope);
  }
}
