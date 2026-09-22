import { Injectable, signal, computed, inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { getDeviceKey } from '../utils/device-key.util';
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

  readonly displayName = signal<string>('');
  readonly specialization = signal<string>('');
  readonly profession = signal<string>('');
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly hasProfile = computed(
    () =>
      this.displayName().trim() !== '' ||
      this.specialization().trim() !== '' ||
      this.profession().trim() !== '',
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

  /** Never rejects: backend down (ERR_CONNECTION_REFUSED) → error signal. */
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(API_URLS.profile, {
        headers: this.headers(),
      });
      if (!res.ok) throw new Error(`Profile unavailable (${res.status}).`);
      const profile = (await res.json()) as Partial<UserProfile> | null;
      if (profile) this.apply(profile);
      this.loaded = true;
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Load failed.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Instant local state (typing) — pair with saveProfile(). */
  stageProfile(partial: Partial<UserProfile>): void {
    this.apply(partial);
  }

  /** Persist current signals to the server. */
  async saveProfile(): Promise<void> {
    try {
      await fetch(API_URLS.profile, {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify({
          displayName: this.displayName(),
          profession: this.profession(),
          specialization: this.specialization(),
        }),
      });
    } catch {
      // Optimistic state stands; next load reconciles.
    }
  }

  /** Optimistic local set + server persist. Debounce at the call site. */
  async updateProfile(partial: Partial<UserProfile>): Promise<void> {
    this.apply(partial);
    await this.saveProfile();
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
