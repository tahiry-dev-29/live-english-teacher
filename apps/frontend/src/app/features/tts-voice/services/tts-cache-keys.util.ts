/** Pure TTS cache-key helpers (T94 split, no Angular deps). */

export const TTS_CACHE_DB_NAME = 'tts_cache_db';
export const TTS_CACHE_DB_VERSION = 1;
export const TTS_CACHE_STORE_NAME = 'audios';
/** LRU cap (entries) and TTL — prune happens on every L2 write. */
export const TTS_CACHE_MAX_L2_ENTRIES = 50;
export const TTS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Join composite key parts deterministically (null/undefined → ''). */
export function joinCacheKeyParts(
  parts: (string | undefined | null)[],
): string {
  return parts.map((p) => p ?? '').join('\u0000');
}

/**
 * Deterministic composite cache key. SHA-256 via `crypto.subtle` when
 * available (secure contexts), FNV-1a fallback otherwise (http, old runtimes).
 */
export async function buildCacheKey(
  parts: (string | undefined | null)[],
): Promise<string> {
  const raw = joinCacheKeyParts(parts);
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(raw),
      );
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fall through to fast hash
  }
  return `fnv-${fastHash(raw)}`;
}

/** FNV-1a 32-bit — fast, deterministic, no dependency. */
export function fastHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** True when a cache entry timestamp is older than the TTL. */
export function isCacheEntryExpired(
  entryTs: number,
  now = Date.now(),
): boolean {
  return now - entryTs > TTS_CACHE_TTL_MS;
}

/**
 * Pick L2 victims: all expired entries plus the oldest beyond the LRU cap.
 * Pure (testable without IndexedDB).
 */
export function pickPruneVictims(
  entries: { key: IDBValidKey; ts: number }[],
  now = Date.now(),
): IDBValidKey[] {
  const expired = entries.filter((e) => now - e.ts > TTS_CACHE_TTL_MS);
  const alive = entries.filter((e) => now - e.ts <= TTS_CACHE_TTL_MS);
  const overCap = alive
    .sort((a, b) => a.ts - b.ts)
    .slice(0, Math.max(0, alive.length - TTS_CACHE_MAX_L2_ENTRIES));
  return [...expired, ...overCap].map((e) => e.key);
}
