import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CookieService } from 'ngx-cookie-service';
import { getDeviceKey } from '@core/utils/device-key.util';
import { API_URLS } from '@shared/constants/api-config';

export interface UserProfile {
  displayName: string;
  specialization: string;
  profession: string;
}

/**
 * Server-backed user profile (task 86, enterprise: DB is the source of
 * truth — no localStorage). Loads once; saves are explicit (debounced by
 * the caller) so typing never hammers the API.
 */
@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly cookies = inject(CookieService);
  private readonly http = inject(HttpClient);

  readonly displayName = signal<string>('');
  readonly specialization = signal<string>('');
  readonly profession = signal<string>('');

  readonly hasProfile = computed(
    () =>
      this.displayName().trim() !== '' ||
      this.specialization().trim() !== '' ||
      this.profession().trim() !== '',
  );

  /** Lazy GET gate — resource stays idle (no request) until ensureLoaded(). */
  private readonly loadGate = signal(0);

  /** GET /user/profile → httpResource (reactive read, no manual triggers). */
  private readonly profileGet = httpResource<Partial<UserProfile> | null>(() =>
    this.loadGate() === 0
      ? undefined
      : { url: API_URLS.profile, headers: this.headers() },
  );

  readonly loading = computed(() => this.profileGet.isLoading());
  readonly error = computed<string | null>(() => {
    // `error()` is safe to read (it projects the state, it does not throw) —
    // unlike `value()`, which throws a ResourceValueError on failure.
    const err = this.profileGet.error();
    if (!err) return null;
    if (typeof err === 'object' && 'status' in err) {
      return `Profile unavailable (${(err as { status: number }).status}).`;
    }
    return err instanceof Error ? err.message : 'Load failed.';
  });
  private loaded = false;

  constructor() {
    // Server state → staged signals (typing state stays local).
    effect(() => {
      // `value()` THROWS a ResourceValueError while the resource is in the
      // error state — gate on `status()` so a failed load never breaks the effect.
      if (this.profileGet.status() === 'error') return;
      const value = this.profileGet.value();
      if (value) {
        this.apply(value);
        this.loaded = true;
      }
    });
  }

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
    this.profileGet.reload();
  }

  /** PUT /user/profile → rxResource action (explicit params signal). */
  private readonly saveRequest = signal<UserProfile | null>(null);
  private readonly profileSave = rxResource({
    params: () => {
      const body = this.saveRequest();
      return body ? { body, headers: this.headers() } : undefined;
    },
    stream: ({ params }) =>
      this.http.put<void>(API_URLS.profile, params.body, {
        headers: params.headers,
      }),
  });

  /** Instant local state (typing) — pair with saveProfile(). */
  stageProfile(partial: Partial<UserProfile>): void {
    this.apply(partial);
  }

  /** Persist current signals to the server (explicit action trigger). */
  saveProfile(): void {
    this.saveRequest.set({
      displayName: this.displayName(),
      profession: this.profession(),
      specialization: this.specialization(),
    });
  }

  /** Optimistic local set + server persist. Debounce at the call site. */
  updateProfile(partial: Partial<UserProfile>): void {
    this.apply(partial);
    this.saveProfile();
  }

  /** Compact context string injected into the AI prompt (tasks 86/87). */
  buildProfileContext(): string {
    const parts: string[] = [];
    const name = this.displayName().trim();
    const spec = this.specialization().trim();
    const prof = this.profession().trim();
    if (name) parts.push(`User's name: ${name}`);
    if (prof) parts.push(`Profession: ${prof}`);
    if (spec) parts.push(`Specialization: ${spec}`);
    if (parts.length === 0) return '';
    return `About the user — ${parts.join(', ')}.`;
  }

  private apply(partial: Partial<UserProfile>): void {
    if (partial.displayName !== undefined) {
      this.displayName.set(partial.displayName);
    }
    if (partial.specialization !== undefined) {
      this.specialization.set(partial.specialization);
    }
    if (partial.profession !== undefined) {
      this.profession.set(partial.profession);
    }
  }
}
