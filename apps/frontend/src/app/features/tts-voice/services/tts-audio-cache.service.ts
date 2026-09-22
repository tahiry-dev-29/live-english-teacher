import { Injectable } from '@angular/core';
import { appLogger } from '@core/services/logging.service';
import {
  TTS_CACHE_DB_NAME,
  TTS_CACHE_DB_VERSION,
  TTS_CACHE_STORE_NAME,
  buildCacheKey,
  isCacheEntryExpired,
  pickPruneVictims,
} from './tts-cache-keys.util';

/** Stored payload in both tiers: blob + creation timestamp (for TTL/LRU). */
interface TtsCacheEntry {
  blob: Blob;
  ts: number;
}

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
  buildKey(parts: (string | undefined | null)[]): Promise<string> {
    return buildCacheKey(parts);
  }

  /** L1 hit, else L2 hit (promoted to L1), else `null`. Never throws. */
  async get(key: string): Promise<Blob | null> {
    const mem = this.memory.get(key);
    if (mem) {
      if (isCacheEntryExpired(mem.ts)) {
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
      if (isCacheEntryExpired(entry.ts)) {
        void this.deleteFromL2(key);
        return null;
      }
      this.memory.set(key, entry); // promote to L1
      return entry.blob;
    } catch (err) {
      appLogger.warn('[TtsAudioCache] L2 read failed — treating as miss', err);
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
      await this.idbRequest(db, 'readwrite', (store) => store.put(entry, key));
      await this.pruneL2(db);
    } catch (err) {
      appLogger.warn(
        '[TtsAudioCache] L2 write failed — kept in memory only',
        err,
      );
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
      const open = indexedDB.open(TTS_CACHE_DB_NAME, TTS_CACHE_DB_VERSION);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(TTS_CACHE_STORE_NAME)) {
          open.result.createObjectStore(TTS_CACHE_STORE_NAME);
        }
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => {
        appLogger.warn('[TtsAudioCache] IndexedDB open failed', open.error);
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
      const tx = db.transaction(TTS_CACHE_STORE_NAME, mode);
      const req = run(tx.objectStore(TTS_CACHE_STORE_NAME));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }

  private async deleteFromL2(key: string): Promise<void> {
    try {
      const db = await this.openDb();
      if (!db) return;
      await this.idbRequest(db, 'readwrite', (store) => store.delete(key));
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
    const victims = pickPruneVictims(
      keys.map((key, i) => ({ key, ts: entries[i]?.ts ?? 0 })),
    );
    for (const victim of victims) {
      await this.idbRequest(db, 'readwrite', (store) => store.delete(victim));
    }
  }
}
