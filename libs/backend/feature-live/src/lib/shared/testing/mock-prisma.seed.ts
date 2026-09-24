/**
 * Seed helpers + user-data model factories for MockPrismaService (T100 split).
 * Chat session/message model surface lives in mock-prisma.service.ts.
 */
import {
  matchesScope,
  createSessionRow,
  createMessageRow,
  createMemoryRow,
  createProfileRow,
  createTagRow,
} from './mock-prisma.factory.ts';

export interface MockStore {
  sessions: Map<string, any>;
  msgs: any[];
  memories: any[];
  profiles: any[];
  tags: any[];
}

export function emptyStore(): MockStore {
  return {
    sessions: new Map(),
    msgs: [],
    memories: [],
    profiles: [],
    tags: [],
  };
}

export function resetStore(store: MockStore): void {
  store.sessions.clear();
  store.msgs = [];
  store.memories = [];
  store.profiles = [];
  store.tags = [];
}

export function orderedMessages(store: MockStore, sessionId: string): any[] {
  return store.msgs
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function lastMessageOf(store: MockStore, sessionId: string): any[] {
  return store.msgs
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 1);
}

export function seedSession(
  store: MockStore,
  data: any,
  messages: Array<{ role: string; content: string; createdAt?: Date }> = [],
): any {
  const session = createSessionRow(data);
  store.sessions.set(session.id, session);
  for (const msg of messages) {
    store.msgs.push(createMessageRow({ sessionId: session.id, ...msg }));
  }
  return session;
}

export interface UserDataCollections {
  memories: any[];
  profiles: any[];
  tags: any[];
}

export function createUserMemoryModel(store: UserDataCollections) {
  return {
    findMany: async (opts?: any) => {
      const list = store.memories.filter((m) =>
        matchesScope(m, opts?.where ?? {}),
      );
      list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return list;
    },
    count: async (opts?: any) =>
      store.memories.filter((m) => matchesScope(m, opts?.where ?? {})).length,
    create: async ({ data }: any) => {
      const m = createMemoryRow(data);
      store.memories.push(m);
      return m;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      store.memories = store.memories.map((m) => {
        if (m.id !== where.id || !matchesScope(m, where)) return m;
        count += 1;
        return { ...m, ...data, updatedAt: new Date() };
      });
      return { count };
    },
    deleteMany: async ({ where }: any) => {
      const before = store.memories.length;
      store.memories = store.memories.filter((m) => {
        if (!matchesScope(m, where ?? {})) return true;
        if ((where ?? {}).id !== undefined && m.id !== where.id) return true;
        return false;
      });
      return { count: before - store.memories.length };
    },
  };
}

export function createUserProfileModel(store: UserDataCollections) {
  return {
    findFirst: async (opts?: any) =>
      store.profiles.find((p) => matchesScope(p, opts?.where ?? {})) ?? null,
    create: async ({ data }: any) => {
      const p = createProfileRow(data);
      store.profiles.push(p);
      return p;
    },
    update: async ({ where, data }: any) => {
      const p = store.profiles.find((x) => x.id === where.id);
      if (!p) throw new Error('Profile not found');
      Object.assign(p, data, { updatedAt: new Date() });
      return p;
    },
  };
}

export function createPromptTagModel(store: UserDataCollections) {
  return {
    findMany: async (opts?: any) => {
      const list = store.tags.filter((t) =>
        matchesScope(t, opts?.where ?? {}),
      );
      list.sort((a, b) => a.name.localeCompare(b.name));
      return list;
    },
    findFirst: async (opts?: any) => {
      const where = opts?.where ?? {};
      return (
        store.tags.find(
          (t) =>
            matchesScope(t, where) &&
            (where.name === undefined || t.name === where.name),
        ) ?? null
      );
    },
    create: async ({ data }: any) => {
      const t = createTagRow(data);
      store.tags.push(t);
      return t;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      store.tags = store.tags.map((t) => {
        if (!matchesScope(t, where)) return t;
        if (where.name !== undefined && t.name !== where.name) return t;
        count += 1;
        return { ...t, ...data, updatedAt: new Date() };
      });
      return { count };
    },
    deleteMany: async ({ where }: any) => {
      const before = store.tags.length;
      store.tags = store.tags.filter((t) => {
        if (!matchesScope(t, where ?? {})) return true;
        if ((where ?? {}).name !== undefined && t.name !== where.name)
          return true;
        return false;
      });
      return { count: before - store.tags.length };
    },
  };
}
