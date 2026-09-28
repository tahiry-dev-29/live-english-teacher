/**
 * Pure prompt-context builder for user memories (task 105).
 * Dependency-free on purpose: `node --test` imports it directly, so no
 * `@shared/constants` alias and no Prisma types — plain data in, string out.
 *
 * Rules:
 * - a memory with `modelScope === null` is global and always included;
 * - a scoped memory is included only when it matches the current model;
 * - most recent first, capped at 50 entries / 4000 characters;
 * - one `- text` line per memory — the single formatting implementation
 *   (the frontend and the Nest service both call this).
 */

export interface MemoryContextEntry {
  id: string;
  text: string;
  modelScope?: string | null;
  updatedAt: Date | string;
}

export const MAX_CONTEXT_MEMORIES = 50;
export const MAX_CONTEXT_CHARS = 4000;

/** Global memories + the memories of `modelScope` (null = globals only). */
export function buildPromptContext(
  entries: readonly MemoryContextEntry[],
  modelScope: string | null,
): string {
  const scoped = entries
    .filter((entry) => matchesScope(entry, modelScope))
    .sort(byMostRecent)
    .slice(0, MAX_CONTEXT_MEMORIES);

  const lines: string[] = [];
  let total = 0;
  for (const entry of scoped) {
    const line = `- ${entry.text}`;
    const added = lines.length === 0 ? line.length : line.length + 1;
    if (total + added > MAX_CONTEXT_CHARS) break;
    lines.push(line);
    total += added;
  }
  return lines.join('\n');
}

function matchesScope(
  entry: MemoryContextEntry,
  modelScope: string | null,
): boolean {
  const scope = entry.modelScope ?? null;
  if (scope === null) return true;
  return modelScope !== null && scope === modelScope;
}

function byMostRecent(a: MemoryContextEntry, b: MemoryContextEntry): number {
  return toMillis(b.updatedAt) - toMillis(a.updatedAt);
}

function toMillis(value: Date | string): number {
  return (value instanceof Date ? value : new Date(value)).getTime();
}
