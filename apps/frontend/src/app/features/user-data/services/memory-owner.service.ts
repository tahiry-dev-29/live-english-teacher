import { Injectable, computed, inject, signal } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { SHARED_MESSAGES } from '@shared/constants';
import { getDeviceKey } from '@core/utils/device-key.util';
import { AiConfigService } from '@features/settings/services/ai-config.service';
import { NotificationService } from './notification.service';

/**
 * Single source of truth for memory ownership + request scope (task 105).
 * Today there is no auth (task 28 TODO): every visitor is a guest —
 * deviceKey owner, never authenticated → writes refused up front with a
 * warning toast, reads stay available. Task 28 will set `ownerId` and the
 * same callers unlock writes without changing.
 */
@Injectable({ providedIn: 'root' })
export class MemoryOwnerService {
  private readonly cookies = inject(CookieService);
  private readonly aiConfig = inject(AiConfigService);
  private readonly notifications = inject(NotificationService);

  /** Stable per-browser key (cookie) — the guest owner until auth lands. */
  readonly deviceKey = signal<string>('');

  /** Authenticated user id — null until task 28. */
  readonly ownerId = signal<string | null>(null);
  readonly isAuthenticated = computed(() => this.ownerId() !== null);

  /** Settings-tab view: globals, or globals + current model. */
  readonly scopeTab = signal<'global' | 'model'>('global');

  /** `provider:modelId` of the selected model (null = none selected). */
  readonly activeModelScope = computed<string | null>(() => {
    const provider = this.aiConfig.provider();
    const modelId = this.aiConfig.selectedModelId();
    return provider && modelId ? `${provider}:${modelId}` : null;
  });

  /** Effective scope sent to the API: null = globals only. */
  readonly effectiveScope = computed<string | null>(() =>
    this.scopeTab() === 'model' ? this.activeModelScope() : null,
  );

  constructor() {
    this.deviceKey.set(getDeviceKey(this.cookies));
  }

  /** Write gate: every mutation passes through here first. */
  checkWrite(): boolean {
    if (this.isAuthenticated()) return true;
    this.notifications.warning(SHARED_MESSAGES.error.authRequired);
    return false;
  }

  notifyQuotaReached(used: number, max: number): void {
    this.notifications.warning(
      SHARED_MESSAGES.error.memoryQuotaReached(used, max),
    );
  }

  headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-device-key': this.deviceKey(),
    };
    const userId = this.ownerId();
    if (userId) headers['x-user-id'] = userId;
    const scope = this.effectiveScope();
    if (scope) headers['x-ai-model'] = scope;
    return headers;
  }
}
