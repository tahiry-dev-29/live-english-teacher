/**
 * Shared in-memory PrismaService mock.
 * No NestJS decorators. No database. Fully synchronous-compatible.
 * T100: session/message surface here; user-data models + store helpers in seed.
 */
import {
  nextId,
  createSessionRow,
  createMessageRow,
} from './mock-prisma.factory.ts';
import {
  emptyStore,
  orderedMessages,
  lastMessageOf,
  createUserMemoryModel,
  createUserProfileModel,
  createPromptTagModel,
} from './mock-prisma.seed.ts';

export class MockPrismaService {
  readonly sessions = emptyStore().sessions;
  msgs: any[] = [];
  memories: any[] = [];
  profiles: any[] = [];
  tags: any[] = [];

  private snapshot() {
    return {
      sessions: this.sessions,
      msgs: this.msgs,
      memories: this.memories,
      profiles: this.profiles,
      tags: this.tags,
    };
  }

  readonly session = {
    create: async ({ data }: any) => {
      const s = createSessionRow(data);
      this.sessions.set(s.id, s);
      return s;
    },

    findUnique: async ({ where, include }: any) => {
      const s = this.sessions.get(where.id);
      if (!s) return null;
      return {
        ...s,
        messages: include ? orderedMessages(this.snapshot(), where.id) : [],
      };
    },

    findMany: async (opts?: any) => {
      const list = [...this.sessions.values()];
      const filtered = opts?.where?.userId
        ? list.filter((s) => s.userId === opts.where.userId)
        : list;
      filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return filtered.map((s) => ({
        ...s,
        messages: lastMessageOf(this.snapshot(), s.id),
      }));
    },

    update: async ({ where, data }: any) => {
      const s = this.sessions.get(where.id);
      if (!s) throw new Error('Session not found');
      const updated = { ...s, ...data, updatedAt: new Date() };
      this.sessions.set(where.id, updated);
      return updated;
    },

    delete: async ({ where }: any) => {
      const s = this.sessions.get(where.id);
      if (!s) throw new Error('Session not found');
      this.sessions.delete(where.id);
      return s;
    },
  };

  readonly message = {
    create: async ({ data }: any) => {
      const m = createMessageRow(data);
      this.msgs.push(m);
      return m;
    },

    createMany: async ({ data }: any) => {
      data.forEach((d: any) => this.msgs.push(createMessageRow(d)));
      return { count: data.length };
    },

    deleteMany: async ({ where }: any) => {
      const before = this.msgs.length;
      this.msgs = this.msgs.filter((m) => m.sessionId !== where.sessionId);
      return { count: before - this.msgs.length };
    },
  };

  reset(): void {
    this.sessions.clear();
    this.msgs = [];
    this.memories = [];
    this.profiles = [];
    this.tags = [];
  }

  readonly userMemory = createUserMemoryModel(this);
  readonly userProfile = createUserProfileModel(this);
  readonly promptTag = createPromptTagModel(this);
}

export { nextId };
