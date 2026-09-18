/**
 * Shared in-memory PrismaService mock.
 * No NestJS decorators. No database. Fully synchronous-compatible.
 */
export class MockPrismaService {
  readonly sessions = new Map<string, any>();
  msgs: any[] = [];

  private nextId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }

  readonly session = {
    create: async ({ data }: any) => {
      const id = this.nextId('sess');
      const s = {
        id,
        title: data.title ?? null,
        learningLanguage: data.learningLanguage ?? 'en',
        userId: data.userId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      };
      this.sessions.set(id, s);
      return s;
    },

    findUnique: async ({ where, include }: any) => {
      const s = this.sessions.get(where.id);
      if (!s) return null;
      const msgs = this.msgs.filter((m) => m.sessionId === where.id);
      const ordered = [...msgs].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      return { ...s, messages: include ? ordered : [] };
    },

    findMany: async (opts?: any) => {
      const list = [...this.sessions.values()];
      const filtered = opts?.where?.userId
        ? list.filter((s) => s.userId === opts.where.userId)
        : list;
      // Sort by updatedAt desc
      filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return filtered.map((s) => {
        const msgs = this.msgs.filter((m) => m.sessionId === s.id);
        const lastMsg = [...msgs]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 1);
        return { ...s, messages: lastMsg };
      });
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
      const m = {
        id: this.nextId('msg'),
        ...data,
        createdAt: data.createdAt ?? new Date(),
      };
      this.msgs.push(m);
      return m;
    },

    createMany: async ({ data }: any) => {
      data.forEach((d: any) =>
        this.msgs.push({
          id: this.nextId('msg'),
          ...d,
          createdAt: d.createdAt ?? new Date(),
        }),
      );
      return { count: data.length };
    },

    deleteMany: async ({ where }: any) => {
      const before = this.msgs.length;
      this.msgs = this.msgs.filter((m) => m.sessionId !== where.sessionId);
      return { count: before - this.msgs.length };
    },
  };

  /** Reset all data between tests */
  reset(): void {
    this.sessions.clear();
    this.msgs = [];
  }
}
