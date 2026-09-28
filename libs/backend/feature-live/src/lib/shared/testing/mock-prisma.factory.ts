/**
 * Pure factories for MockPrismaService rows (T100 split).
 * No store access — each builder returns a plain object.
 */

export function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function matchesScope(row: any, where: any): boolean {
  if (where.userId !== undefined && row.userId !== where.userId) return false;
  if (where.deviceKey !== undefined && row.deviceKey !== where.deviceKey)
    return false;
  if (where.id !== undefined && row.id !== where.id) return false;
  if (
    where.modelScope !== undefined &&
    !matchesModelScope(row, where.modelScope)
  )
    return false;
  if (
    Array.isArray(where.OR) &&
    !where.OR.some((branch: any) => matchesScopeRow(row, branch))
  )
    return false;
  return true;
}

/** Owner-only predicates (userId/deviceKey/id) shared with OR branches. */
function matchesScopeRow(row: any, where: any): boolean {
  if (where.userId !== undefined && row.userId !== where.userId) return false;
  if (where.deviceKey !== undefined && row.deviceKey !== where.deviceKey)
    return false;
  if (where.id !== undefined && row.id !== where.id) return false;
  if (
    where.modelScope !== undefined &&
    !matchesModelScope(row, where.modelScope)
  )
    return false;
  return true;
}

function matchesModelScope(row: any, expected: any): boolean {
  const scope = row.modelScope ?? null;
  if (expected === null) return scope === null;
  if (typeof expected === 'object' && expected !== null) {
    if (Array.isArray(expected.in)) {
      return expected.in.some(
        (value: any) => (value ?? null) === (scope ?? null),
      );
    }
    if (expected.not !== undefined) return scope !== (expected.not ?? null);
  }
  return scope === (expected ?? null);
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
    modelScope: data.modelScope ?? null,
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
