import { Injectable, signal, computed, inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { environment } from '@environment';
import { getDeviceKey } from '../utils/device-key.util';

export interface PromptTag {
  name: string;
  description: string;
  systemPrompt: string;
  custom?: boolean;
}

/**
 * Server-backed prompt tags (task 87, enterprise: DB is the source of
 * truth — built-ins come from the API, custom tags persist per device).
 * Suggestion/matching stays synchronous over loaded signals.
 */
@Injectable({
  providedIn: 'root',
})
export class PromptTagService {
  private readonly cookies = inject(CookieService);

  readonly defaults = signal<PromptTag[]>([]);
  readonly customTags = signal<PromptTag[]>([]);
  readonly loading = signal<boolean>(false);

  readonly allTags = computed<PromptTag[]>(() => [
    ...this.defaults(),
    ...this.customTags(),
  ]);

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
    try {
      const res = await fetch(`${environment.apiBaseUrl}/user/tags`, {
        headers: this.headers(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        defaults: PromptTag[];
        custom: PromptTag[];
      };
      this.defaults.set(data.defaults ?? []);
      this.customTags.set(
        (data.custom ?? []).map((t) => ({ ...t, custom: true })),
      );
      this.loaded = true;
    } finally {
      this.loading.set(false);
    }
  }

  /** Tag names (without #) found in the text, matched against known tags. */
  extractTags(text: string): string[] {
    const found = new Set<string>();
    const re = /#([A-Za-z0-9_-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = (m[1] ?? '').toLowerCase();
      if (this.allTags().some((t) => t.name.toLowerCase() === name)) {
        found.add(name);
      }
    }
    return [...found];
  }

  /** System context built from the tags mentioned in the text. */
  buildSystemPrompt(text: string): string {
    const names = this.extractTags(text);
    if (names.length === 0) return '';
    const prompts: string[] = [];
    for (const n of names) {
      const tag = this.allTags().find(
        (t) => t.name.toLowerCase() === n.toLowerCase(),
      );
      if (tag) prompts.push(`[${tag.name}: ${tag.systemPrompt}]`);
    }
    return prompts.join('\n');
  }

  /** Raw user text + invisible tag context sent to the backend. */
  enrichMessage(text: string): string {
    const ctx = this.buildSystemPrompt(text);
    if (!ctx) return text;
    return `${text}\n\n[chat-skills context — apply for this chat only:]\n${ctx}`;
  }

  /** Suggest tags matching the current #token (without the #). */
  suggest(token: string): PromptTag[] {
    const q = token.toLowerCase();
    return this.allTags().filter((t) => t.name.toLowerCase().startsWith(q));
  }

  async addCustom(
    name: string,
    description: string,
  ): Promise<PromptTag | null> {
    const cleanName = name
      .trim()
      .toLowerCase()
      .replace(/^#+/, '')
      .replace(/\s+/g, '-');
    const cleanDesc = description.trim();
    if (!cleanName || !cleanDesc) return null;
    try {
      const res = await fetch(`${environment.apiBaseUrl}/user/tags`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ name: cleanName, description: cleanDesc }),
      });
      if (!res.ok) return null;
      const created = (await res.json()) as PromptTag;
      const tag: PromptTag = { ...created, custom: true };
      this.customTags.update((list) => [...list, tag]);
      return tag;
    } catch {
      return null;
    }
  }

  async updateCustom(name: string, description: string): Promise<boolean> {
    const cleanDesc = description.trim();
    if (!cleanDesc) return false;
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/user/tags/${encodeURIComponent(name)}`,
        {
          method: 'PATCH',
          headers: this.headers(),
          body: JSON.stringify({ description: cleanDesc }),
        },
      );
      if (!res.ok) return false;
      this.customTags.update((list) =>
        list.map((t) =>
          t.name === name
            ? { ...t, description: cleanDesc, systemPrompt: cleanDesc }
            : t,
        ),
      );
      return true;
    } catch {
      return false;
    }
  }

  async removeCustom(name: string): Promise<void> {
    this.customTags.update((list) => list.filter((t) => t.name !== name));
    try {
      await fetch(
        `${environment.apiBaseUrl}/user/tags/${encodeURIComponent(name)}`,
        { method: 'DELETE', headers: this.headers() },
      );
    } catch {
      // Optimistic removal stands.
    }
  }

  async resetDefaults(): Promise<void> {
    this.customTags.set([]);
    try {
      await fetch(`${environment.apiBaseUrl}/user/tags/reset`, {
        method: 'DELETE',
        headers: this.headers(),
      });
    } catch {
      // Optimistic reset stands.
    }
  }
}
