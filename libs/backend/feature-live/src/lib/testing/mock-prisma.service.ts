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
    this.memories = [];
    this.profiles = [];
    this.tags = [];
  }

  // ── Enterprise user data (tasks 85/86/87) ────────────────────────────────

  memories: any[] = [];
  profiles: any[] = [];
  tags: any[] = [];

  private matchesScope(row: any, where: any): boolean {
    if (where.userId !== undefined) return row.userId === where.userId;
    if (where.deviceKey !== undefined)
      return row.deviceKey === where.deviceKey;
    return true;
  }

  readonly userMemory = {
    findMany: async (opts?: any) => {
      const list = this.memories.filter((m) =>
        this.matchesScope(m, opts?.where ?? {}),
      );
      list.sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      );
      return list;
    },

    count: async (opts?: any) =>
      this.memories.filter((m) => this.matchesScope(m, opts?.where ?? {}))
        .length,

    create: async ({ data }: any) => {
      const m = {
        id: this.nextId('mem'),
        userId: data.userId ?? null,
        deviceKey: data.deviceKey,
        text: data.text,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memories.push(m);
      return m;
    },

    updateMany: async ({ where, data }: any) => {
      let count = 0;
      this.memories = this.memories.map((m) => {
        if (m.id !== where.id || !this.matchesScope(m, where)) return m;
        count += 1;
        return { ...m, ...data, updatedAt: new Date() };
      });
      return { count };
    },

    deleteMany: async ({ where }: any) => {
      const before = this.memories.length;
      this.memories = this.memories.filter((m) => {
        if (!this.matchesScope(m, where ?? {})) return true;
        if ((where ?? {}).id !== undefined && m.id !== where.id) return true;
        return false;
      });
      return { count: before - this.memories.length };
    },
  };

  readonly userProfile = {
    findFirst: async (opts?: any) =>
      this.profiles.find((p) => this.matchesScope(p, opts?.where ?? {})) ??
      null,

    create: async ({ data }: any) => {
      const p = {
        id: this.nextId('prof'),
        userId: data.userId ?? null,
        deviceKey: data.deviceKey,
        displayName: data.displayName ?? '',
        profession: data.profession ?? '',
        specialization: data.specialization ?? '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.profiles.push(p);
      return p;
    },

    update: async ({ where, data }: any) => {
      const p = this.profiles.find((x) => x.id === where.id);
      if (!p) throw new Error('Profile not found');
      Object.assign(p, data, { updatedAt: new Date() });
      return p;
    },
  };

  readonly promptTag = {
    findMany: async (opts?: any) => {
      const list = this.tags.filter((t) =>
        this.matchesScope(t, opts?.where ?? {}),
      );
      list.sort((a, b) => a.name.localeCompare(b.name));
      return list;
    },

    findFirst: async (opts?: any) => {
      const where = opts?.where ?? {};
      return (
        this.tags.find(
          (t) =>
            this.matchesScope(t, where) &&
            (where.name === undefined || t.name === where.name),
        ) ?? null
      );
    },

    create: async ({ data }: any) => {
      const t = {
        id: this.nextId('tag'),
        userId: data.userId ?? null,
        deviceKey: data.deviceKey,
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.tags.push(t);
      return t;
    },

    updateMany: async ({ where, data }: any) => {
      let count = 0;
      this.tags = this.tags.map((t) => {
        if (!this.matchesScope(t, where)) return t;
        if (where.name !== undefined && t.name !== where.name) return t;
        count += 1;
        return { ...t, ...data, updatedAt: new Date() };
      });
      return { count };
    },

    deleteMany: async ({ where }: any) => {
      const before = this.tags.length;
      this.tags = this.tags.filter((t) => {
        if (!this.matchesScope(t, where ?? {})) return true;
        if ((where ?? {}).name !== undefined && t.name !== where.name)
          return true;
        return false;
      });
      return { count: before - this.tags.length };
    },
  };
}
