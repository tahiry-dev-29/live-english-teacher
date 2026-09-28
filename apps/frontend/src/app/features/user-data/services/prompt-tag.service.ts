import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CookieService } from 'ngx-cookie-service';
import { getDeviceKey } from '@core/utils/device-key.util';
import { API_URLS, DYNAMIC_ENDPOINTS } from '@shared/constants/api-config';

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
  private readonly http = inject(HttpClient);

  readonly defaults = signal<PromptTag[]>([]);
  readonly customTags = signal<PromptTag[]>([]);

  readonly allTags = computed<PromptTag[]>(() => [
    ...this.defaults(),
    ...this.customTags(),
  ]);

  /** Lazy GET gate — idle until ensureLoaded(). */
  private readonly loadGate = signal(0);

  /** GET /user/tags → httpResource (reactive read, auto loading/error). */
  private readonly tagsGet = httpResource<{
    defaults: PromptTag[];
    custom: PromptTag[];
  }>(() =>
    this.loadGate() === 0
      ? undefined
      : { url: API_URLS.tags, headers: this.headers() },
  );

  readonly loading = computed(() => this.tagsGet.isLoading());
  readonly error = computed<string | null>(() => {
    // `error()` is safe to read (it projects the state, it does not throw) —
    // unlike `value()`, which throws a ResourceValueError on failure.
    const err = this.tagsGet.error();
    if (!err) return null;
    if (typeof err === 'object' && 'status' in err) {
      return `Tags unavailable (${(err as { status: number }).status}).`;
    }
    return err instanceof Error ? err.message : 'Load failed.';
  });
  private loaded = false;

  constructor() {
    effect(() => {
      // `value()` THROWS a ResourceValueError while the resource is in the
      // error state — gate on `status()` so a failed load never breaks the effect.
      if (this.tagsGet.status() === 'error') return;
      const data = this.tagsGet.value();
      if (data) {
        this.defaults.set(data.defaults ?? []);
        this.customTags.set(
          (data.custom ?? []).map((t) => ({ ...t, custom: true })),
        );
        this.loaded = true;
      }
    });
    effect(() => {
      const created = this.addResult.value();
      if (created) {
        const tag: PromptTag = { ...created, custom: true };
        this.customTags.update((list) =>
          list.some((t) => t.name === tag.name) ? list : [...list, tag],
        );
        this.addIntent.set(null);
      }
    });
    effect(() => {
      const updated = this.updateResult.value();
      const intent = this.updateIntent();
      if (updated && intent) {
        this.customTags.update((list) =>
          list.map((t) =>
            t.name === intent.name
              ? {
                  ...t,
                  description: intent.description,
                  systemPrompt: intent.description,
                }
              : t,
          ),
        );
        this.updateIntent.set(null);
      }
    });
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-device-key': getDeviceKey(this.cookies),
    };
  }

  /** Flip the gate: first call fires the GET. */
  ensureLoaded(): void {
    if (this.loaded) return;
    if (this.loadGate() === 0) this.loadGate.set(1);
  }

  /** Reload the GET resource (retry button). */
  load(): void {
    this.tagsGet.reload();
  }

  /** POST /user/tags → rxResource. */
  private readonly addIntent = signal<{
    name: string;
    description: string;
  } | null>(null);
  readonly addResult = rxResource({
    params: () => {
      const intent = this.addIntent();
      if (!intent) return undefined;
      const cleanName = intent.name
        .trim()
        .toLowerCase()
        .replace(/^#+/, '')
        .replace(/\s+/g, '-');
      const cleanDesc = intent.description.trim();
      if (!cleanName || !cleanDesc) return undefined;
      return {
        body: { name: cleanName, description: cleanDesc },
        headers: this.headers(),
      };
    },
    stream: ({ params }) =>
      this.http.post<PromptTag>(API_URLS.tags, params.body, {
        headers: params.headers,
      }),
  });

  /** PATCH /user/tags/:name → rxResource. */
  private readonly updateIntent = signal<{
    name: string;
    description: string;
  } | null>(null);
  readonly updateResult = rxResource({
    params: () => {
      const intent = this.updateIntent();
      const cleanDesc = intent?.description.trim() ?? '';
      if (!intent || !cleanDesc) return undefined;
      return { ...intent, description: cleanDesc, headers: this.headers() };
    },
    stream: ({ params }) =>
      this.http.patch<PromptTag>(
        DYNAMIC_ENDPOINTS.tagByName(params.name),
        { description: params.description },
        { headers: params.headers },
      ),
  });

  /** DELETE /user/tags/:name → rxResource. */
  private readonly removeIntent = signal<{ name: string } | null>(null);
  readonly removeResult = rxResource({
    // `?? undefined`: a null params would be read as a request and DELETE on init.
    params: () => this.removeIntent() ?? undefined,
    stream: ({ params }) =>
      this.http.delete<void>(DYNAMIC_ENDPOINTS.tagByName(params.name), {
        headers: this.headers(),
      }),
  });

  /** DELETE /user/tags/reset → rxResource. */
  private readonly resetIntent = signal<number>(0);
  readonly resetResult = rxResource({
    params: () => (this.resetIntent() === 0 ? undefined : { n: 1 }),
    stream: () =>
      this.http.delete<void>(API_URLS.tagsReset, {
        headers: this.headers(),
      }),
  });

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

  /** POST trigger — intent signal, result merged via addResult effect. */
  addCustom(name: string, description: string): void {
    if (!name.trim() || !description.trim()) return;
    this.addIntent.set({ name, description });
  }

  /** PATCH trigger — intent signal, merged via updateResult effect. */
  updateCustom(name: string, description: string): void {
    if (!description.trim()) return;
    this.updateIntent.set({ name, description });
  }

  /** DELETE trigger (optimistic removal). */
  removeCustom(name: string): void {
    this.customTags.update((list) => list.filter((t) => t.name !== name));
    this.removeIntent.set({ name });
  }

  /** DELETE-all trigger (optimistic reset). */
  resetDefaults(): void {
    this.customTags.set([]);
    this.resetIntent.update((n) => n + 1);
  }
}
