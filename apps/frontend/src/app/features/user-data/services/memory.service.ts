import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CookieService } from 'ngx-cookie-service';
import { getDeviceKey } from '@core/utils/device-key.util';
import { API_URLS, DYNAMIC_ENDPOINTS } from '@shared/constants/api-config';

export interface UserMemory {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Server-backed user memories (task 85, enterprise: DB is the source of
 * truth — no localStorage). Quota enforced by the API; the counter here is
 * an instant UI guard only.
 */
@Injectable({
  providedIn: 'root',
})
export class MemoryService {
  static readonly MAX_MEMORIES = 50;

  private readonly cookies = inject(CookieService);
  private readonly http = inject(HttpClient);

  readonly memories = signal<UserMemory[]>([]);
  readonly count = computed(() => this.memories().length);
  readonly isFull = computed(
    () => this.memories().length >= MemoryService.MAX_MEMORIES,
  );

  /** Lazy GET gate: resource stays idle until ensureLoaded() flips it. */
  private readonly loadGate = signal(0);

  /** GET /user/memories → httpResource (reactive read, auto state). */
  private readonly memoriesGet = httpResource<UserMemory[]>(() =>
    this.loadGate() === 0
      ? undefined
      : { url: API_URLS.memories, headers: this.headers() },
  );

  readonly loading = computed(() => this.memoriesGet.isLoading());
  readonly error = computed<string | null>(() => {
    // `error()` is safe to read (it projects the state, it does not throw) —
    // unlike `value()`, which throws a ResourceValueError on failure.
    const err = this.memoriesGet.error();
    if (!err) return null;
    if (typeof err === 'object' && 'status' in err) {
      return `Memories unavailable (${(err as { status: number }).status}).`;
    }
    return err instanceof Error ? err.message : 'Load failed.';
  });
  private loaded = false;

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-device-key': getDeviceKey(this.cookies),
    };
  }

  /** Flip the gate: first call fires the GET, later calls are no-ops. */
  ensureLoaded(): void {
    if (this.loaded) return;
    if (this.loadGate() === 0) this.loadGate.set(1);
  }

  /** Reload the GET resource (retry button). */
  load(): void {
    this.memoriesGet.reload();
  }

  /** POST /user/memories → rxResource (intent signal, no Promise/fetch). */
  private readonly addIntent = signal<{ text: string } | null>(null);
  readonly addResult = rxResource({
    // `?? undefined`: a null params would be read as a request and POST on init.
    params: () => this.addIntent() ?? undefined,
    stream: ({ params }) =>
      this.http.post<UserMemory>(
        API_URLS.memories,
        { text: params.text },
        { headers: this.headers() },
      ),
  });

  /**
   * PATCH /user/memories/:id → rxResource.
   * `params` MUST return undefined (never null) when idle: rxResource treats a
   * non-undefined value as a request and would fire `PATCH /memories/` on init.
   */
  private readonly updateIntent = signal<{ id: string; text: string } | null>(
    null,
  );
  readonly updateResult = rxResource({
    params: () => this.updateIntent() ?? undefined,
    stream: ({ params }) =>
      this.http.patch<UserMemory>(
        DYNAMIC_ENDPOINTS.memoryById(params.id),
        { text: params.text },
        { headers: this.headers() },
      ),
  });

  /** DELETE /user/memories/:id → rxResource (same undefined gate as above). */
  private readonly removeIntent = signal<{ id: string } | null>(null);
  readonly removeResult = rxResource({
    params: () => this.removeIntent() ?? undefined,
    stream: ({ params }) =>
      this.http.delete<void>(DYNAMIC_ENDPOINTS.memoryById(params.id), {
        headers: this.headers(),
      }),
  });

  /** DELETE /user/memories → rxResource. */
  private readonly clearIntent = signal<number>(0);
  readonly clearResult = rxResource({
    params: () => (this.clearIntent() === 0 ? undefined : { n: 1 }),
    stream: () =>
      this.http.delete<void>(API_URLS.memories, {
        headers: this.headers(),
      }),
  });

  constructor() {
    // Merge server state (GET) + mutation results — no manual loading/error.
    effect(() => {
      // `value()` THROWS a ResourceValueError while the resource is in the
      // error state — gate on `status()` so a failed load never breaks the effect.
      if (this.memoriesGet.status() === 'error') return;
      const value = this.memoriesGet.value();
      if (value) {
        this.memories.set(value);
        this.loaded = true;
      }
    });
    effect(() => {
      const created = this.addResult.value();
      if (created) {
        this.memories.update((list) =>
          list.some((m) => m.id === created.id) ? list : [created, ...list],
        );
        this.addIntent.set(null);
      }
    });
    effect(() => {
      const updated = this.updateResult.value();
      const intent = this.updateIntent();
      if (updated && intent) {
        this.memories.update((list) =>
          list.map((m) => (m.id === intent.id ? updated : m)),
        );
        this.updateIntent.set(null);
      }
    });
  }

  /** POST trigger — fire-and-read: intent signal, result via addResult. */
  add(text: string): void {
    const clean = text.trim();
    if (!clean || this.isFull()) return;
    this.addIntent.set({ text: clean });
  }

  /** PATCH trigger (optimistic text, reconciled by updateResult effect). */
  update(id: string, text: string): void {
    const clean = text.trim();
    if (!clean) return;
    this.updateIntent.set({ id, text: clean });
  }

  /** DELETE trigger (optimistic removal, reconciled by resource reload). */
  remove(id: string): void {
    this.memories.update((list) => list.filter((m) => m.id !== id));
    this.removeIntent.set({ id });
  }

  /** DELETE-all trigger (optimistic clear). */
  clear(): void {
    this.memories.set([]);
    this.clearIntent.update((n) => n + 1);
  }

  /** Compact context string injected into the AI prompt (task 85/87). */
  buildMemoryContext(): string {
    const list = this.memories();
    if (list.length === 0) return '';
    return list.map((m) => `- ${m.text}`).join('\n');
  }

  list(): UserMemory[] {
    return this.memories();
  }
}
