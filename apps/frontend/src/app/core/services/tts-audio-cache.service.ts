import { Injectable } from '@angular/core';

/** Stored payload in both tiers: blob + creation timestamp (for TTL/LRU). */
interface TtsCacheEntry {
  blob: Blob;
  ts: number;
}

const DB_NAME = 'tts_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'audios';
/** LRU cap (entries) and TTL — prune happens on every L2 write. */
const MAX_L2_ENTRIES = 50;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Two-tier cache for synthesized TTS audio blobs.
 *
 * - L1: in-memory Map — instant hits during the active session.
 * - L2: native IndexedDB (`tts_cache_db/audios`) — persistence across reloads.
 *
 * Resilience contract: any L2 failure is swallowed (`console.warn`) and the
 * caller falls back to a fresh network fetch — caching must never break
 * playback. Keys are composite hashes of (text, voice, model, provider, lang)
 * so changing any of them never replays stale audio.
 */
@Injectable({
  providedIn: 'root',
})
export class TtsAudioCacheService {
  /** L1 — session memory. */
  private readonly memory = new Map<string, TtsCacheEntry>();
  /** In-flight request collapsing: one network fetch per concurrent key. */
  private readonly inFlightRequests = new Map<string, Promise<Blob>>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  /**
   * Deterministic composite cache key. SHA-256 via `crypto.subtle` when
   * available (secure contexts), FNV-1a fallback otherwise (http, old runtimes).
   */
  async buildKey(parts: (string | undefined | null)[]): Promise<string> {
    const raw = parts.map((p) => p ?? '').join('\u0000');
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
    return `fnv-${this.fastHash(raw)}`;
  }

  /** L1 hit, else L2 hit (promoted to L1), else `null`. Never throws. */
  async get(key: string): Promise<Blob | null> {
    const mem = this.memory.get(key);
    if (mem) {
      if (Date.now() - mem.ts > TTL_MS) {
        this.memory.delete(key);
        void this.deleteFromL2(key);
        return null;
      }
      return mem.blob;
    }

    try {
      const db = await this.openDb();
      if (!db) return null;
      const entry = await this.idbRequest<TtsCacheEntry | undefined>(
        db,
        'readonly',
        (store) => store.get(key),
      );
      if (!entry?.blob) return null;
      if (Date.now() - entry.ts > TTL_MS) {
        void this.deleteFromL2(key);
        return null;
      }
      this.memory.set(key, entry); // promote to L1
      return entry.blob;
    } catch (err) {
      console.warn('[TtsAudioCache] L2 read failed — treating as miss', err);
      return null;
    }
  }

  /** Store in L1 immediately; persist to L2 asynchronously (never throws). */
  async put(key: string, blob: Blob): Promise<void> {
    const entry: TtsCacheEntry = { blob, ts: Date.now() };
    this.memory.set(key, entry);
    try {
      const db = await this.openDb();
      if (!db) return;
      await this.idbRequest(db, 'readwrite', (store) => {
        store.put(entry, key);
      });
      await this.pruneL2(db);
    } catch (err) {
      console.warn('[TtsAudioCache] L2 write failed — kept in memory only', err);
    }
  }

  /**
   * Cache-aside orchestration: L1/L2 check → in-flight collapsing → fresh
   * fetch (populates both tiers). A fetcher rejection propagates to all
   * awaiting callers and is never cached.
   */
  async getOrFetch(key: string, fetcher: () => Promise<Blob>): Promise<Blob> {
    const cached = await this.get(key);
    if (cached) return cached;

    const inflight = this.inFlightRequests.get(key);
    if (inflight) return inflight;

    const request = fetcher()
      .then((blob) => {
        this.inFlightRequests.delete(key);
        void this.put(key, blob);
        return blob;
      })
      .catch((err: unknown) => {
        this.inFlightRequests.delete(key);
        throw err;
      });
    this.inFlightRequests.set(key, request);
    return request;
  }



  // ---------------------------------------------------------------- internals

  private openDb(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null); // SSR / environments without IDB — L1 only
        return;
      }
      const open = indexedDB.open(DB_NAME, DB_VERSION);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(STORE_NAME)) {
          open.result.createObjectStore(STORE_NAME);
        }
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => {
        console.warn('[TtsAudioCache] IndexedDB open failed', open.error);
        resolve(null);
      };
    });
    return this.dbPromise;
  }

  private idbRequest<T>(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const req = run(tx.objectStore(STORE_NAME));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }

  private async deleteFromL2(key: string): Promise<void> {
    try {
      const db = await this.openDb();
      if (!db) return;
      await this.idbRequest(db, 'readwrite', (store) => {
        store.delete(key);
      });
    } catch {
      // best-effort only
    }
  }

  /** Evict expired entries, then oldest ones beyond the LRU cap. */
  private async pruneL2(db: IDBDatabase): Promise<void> {
    const keys = await this.idbRequest<IDBValidKey[]>(db, 'readonly', (store) =>
      store.getAllKeys(),
    );
    const entries = await this.idbRequest<TtsCacheEntry[]>(
      db,
      'readonly',
      (store) => store.getAll(),
    );

    const stale: { key: IDBValidKey; ts: number }[] = keys.map((key, i) => ({
      key,
      ts: entries[i]?.ts ?? 0,
    }));

    const expired = stale.filter((e) => Date.now() - e.ts > TTL_MS);
    const alive = stale.filter((e) => Date.now() - e.ts <= TTL_MS);
    const overCap = alive
      .sort((a, b) => a.ts - b.ts)
      .slice(0, Math.max(0, alive.length - MAX_L2_ENTRIES));

    for (const victim of [...expired, ...overCap]) {
      await this.idbRequest(db, 'readwrite', (store) => {
        store.delete(victim.key);
      });
    }
  }

  /** FNV-1a 32-bit — fast, deterministic, no dependency. */
  private fastHash(s: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
}
