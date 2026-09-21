import { Injectable, signal, computed, inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { environment } from '@environment';
import { getDeviceKey } from '../utils/device-key.util';

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

  readonly memories = signal<UserMemory[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly count = computed(() => this.memories().length);
  readonly isFull = computed(
    () => this.memories().length >= MemoryService.MAX_MEMORIES,
  );

  private loaded = false;
  private inflight: Promise<void> | null = null;

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-device-key': getDeviceKey(this.cookies),
    };
  }

  ensureLoaded(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (!this.inflight)
      this.inflight = this.load().finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${environment.apiBaseUrl}/user/memories`, {
        headers: this.headers(),
      });
      if (!res.ok) throw new Error(`Memories unavailable (${res.status}).`);
      this.memories.set((await res.json()) as UserMemory[]);
      this.loaded = true;
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Load failed.');
    } finally {
      this.loading.set(false);
    }
  }

  async add(text: string): Promise<UserMemory | null> {
    const clean = text.trim();
    if (!clean || this.isFull()) return null;
    try {
      const res = await fetch(`${environment.apiBaseUrl}/user/memories`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) return null;
      const created = (await res.json()) as UserMemory;
      this.memories.update((list) => [created, ...list]);
      return created;
    } catch {
      return null;
    }
  }

  async update(id: string, text: string): Promise<boolean> {
    const clean = text.trim();
    if (!clean) return false;
    try {
      const res = await fetch(`${environment.apiBaseUrl}/user/memories/${id}`, {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) return false;
      this.memories.update((list) =>
        list.map((m) => (m.id === id ? { ...m, text: clean } : m)),
      );
      return true;
    } catch {
      return false;
    }
  }

  async remove(id: string): Promise<void> {
    this.memories.update((list) => list.filter((m) => m.id !== id));
    try {
      await fetch(`${environment.apiBaseUrl}/user/memories/${id}`, {
        method: 'DELETE',
        headers: this.headers(),
      });
    } catch {
      // Optimistic removal stands; list refreshes on next load.
    }
  }

  async clear(): Promise<void> {
    this.memories.set([]);
    try {
      await fetch(`${environment.apiBaseUrl}/user/memories`, {
        method: 'DELETE',
        headers: this.headers(),
      });
    } catch {
      // Optimistic clear stands.
    }
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
