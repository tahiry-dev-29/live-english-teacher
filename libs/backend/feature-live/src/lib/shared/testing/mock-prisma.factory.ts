/**
 * Pure factories for MockPrismaService rows (T100 split).
 * No store access — each builder returns a plain object.
 */

export function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function matchesScope(row: any, where: any): boolean {
  if (where.userId !== undefined) return row.userId === where.userId;
  if (where.deviceKey !== undefined) return row.deviceKey === where.deviceKey;
  return true;
}

export function createSessionRow(data: any): any {
  return {
    id: nextId('sess'),
    title: data.title ?? null,
    learningLanguage: data.learningLanguage ?? 'en',
    userId: data.userId ?? null,
    isPinned: data.isPinned ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };
}

export function createMessageRow(data: any, id = nextId('msg')): any {
  return {
    id,
    ...data,
    createdAt: data.createdAt ?? new Date(),
  };
}

export function createMemoryRow(data: any): any {
  return {
    id: nextId('mem'),
    userId: data.userId ?? null,
    deviceKey: data.deviceKey,
    text: data.text,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createProfileRow(data: any): any {
  return {
    id: nextId('prof'),
    userId: data.userId ?? null,
    deviceKey: data.deviceKey,
    displayName: data.displayName ?? '',
    profession: data.profession ?? '',
    specialization: data.specialization ?? '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createTagRow(data: any): any {
  return {
    id: nextId('tag'),
    userId: data.userId ?? null,
    deviceKey: data.deviceKey,
    name: data.name,
    description: data.description,
    systemPrompt: data.systemPrompt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
