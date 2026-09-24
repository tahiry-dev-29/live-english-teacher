import { Injectable, signal, effect, inject, DestroyRef } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import {
  migrateLocalStorageToCookie,
  readPrefCookie,
  writePrefCookie,
} from '@core/utils/cookie.util';
import { ApiKeyService } from './api-key.service';
import { MESSAGES } from '@core/constants/messages';
import { API_URLS } from '@shared/constants/api-config';
import { LoggingService } from '@core/services/logging.service';
import { resolveActiveProvider } from './ai-providers.util';
import {
  getModelsForProvider as filterModelsForProvider,
  mergeLiveModels,
  pruneProviderModels,
  resolveModel as resolveCatalogModel,
  selectValidModelId,
  type AiModel,
} from './ai-models-catalog.util';
import { AiConfigIdleHelper } from './ai-config-idle.util';

@Injectable({
  providedIn: 'root',
})
export class AiConfigService {
  private readonly logger = inject(LoggingService);
  private static readonly COOKIE_PROVIDER = 'ai_provider';
  private static readonly COOKIE_MODEL = 'ai_model';

  private readonly cookies = inject(CookieService);
  private readonly apiKeyService = inject(ApiKeyService);

  // Live-only: no hardcoded models. Starts empty, filled from /ai/models.
  readonly models = signal<AiModel[]>([]);
  readonly loading = signal<boolean>(false);
  readonly fetchFailed = signal<boolean>(false);
  readonly lastFetchedProvider = signal<string | null>(null);
  readonly liveError = signal<string | null>(null);

  readonly provider = signal<string>(
    this.loadCookie(AiConfigService.COOKIE_PROVIDER, 'groq'),
  );

  readonly selectedModelId = signal<string>(
    this.loadCookie(AiConfigService.COOKIE_MODEL, ''),
  );

  readonly selectedModel = signal<AiModel | null>(
    this.resolveModel(this.provider(), this.selectedModelId()),
  );

  constructor() {
    const idleHelper = new AiConfigIdleHelper(
      (provider, force) => this.fetchModels(provider, force),
      () => this.provider(),
      () => this.fetchFailed(),
      (value) => this.fetchFailed.set(value),
      () => this.liveError(),
      (value) => this.liveError.set(value),
      this.logger,
      inject(DestroyRef),
    );
    idleHelper.scheduleIdleFetch();
    idleHelper.resubscribeOnReconnect();

    effect(() => {
      const p = this.provider();
      const m = this.selectedModelId();
      writePrefCookie(this.cookies, AiConfigService.COOKIE_PROVIDER, p);
      writePrefCookie(this.cookies, AiConfigService.COOKIE_MODEL, m);
      this.selectedModel.set(this.resolveModel(p, m));
    });
  }

  async fetchModels(providerId?: string, force = false): Promise<void> {
    if (this.loading()) return;

    const rawProvider = providerId || this.provider();
    // 'default' means the server default: fetch all providers.
    const activeProvider = resolveActiveProvider(rawProvider);

    if (!force && this.fetchFailed()) return;
    if (!force && this.lastFetchedProvider() === rawProvider) return;

    // Offline (task 81): never hammer the API while the browser is offline.
    // Transient state — do NOT set fetchFailed so the `online` event can retry.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.liveError.set('You are offline. Models will load when back online.');
      return;
    }

    this.loading.set(true);
    if (force) {
      this.fetchFailed.set(false);
      this.liveError.set(null);
    }

    try {
      const headers: Record<string, string> = {};
      if (activeProvider) {
        headers['x-provider'] = activeProvider;
      }

      const keys = this.apiKeyService.customKeys();
      for (const [p, k] of Object.entries(keys)) {
        if (k) {
          headers[`x-${p}-api-key`] = k;
        }
      }

      const response = await fetch(API_URLS.models, {
        headers,
      });
      if (response.ok) {
        const fetched = (await response.json()) as AiModel[];
        if (Array.isArray(fetched) && fetched.length > 0) {
          // Merge live results, keep other providers' live models.
          this.models.set(
            mergeLiveModels(this.models(), fetched, activeProvider),
          );
          this.lastFetchedProvider.set(rawProvider);
          this.ensureValidSelection();
        } else {
          // Live API returned empty: no mocks, surface empty + hint.
          this.models.set(pruneProviderModels(this.models(), activeProvider));
          this.fetchFailed.set(true);
          this.liveError.set(
            'No live models for this provider. Add an API key or check server keys.',
          );
        }
      } else {
        this.fetchFailed.set(true);
        this.liveError.set(
          `Live models unavailable (${response.status}). Add an API key.`,
        );
      }
    } catch (error) {
      this.fetchFailed.set(true);
      this.liveError.set('Live models fetch failed. Check network / API key.');
      this.logger.warn(MESSAGES.log.modelsFetchFailed, error);
    } finally {
      this.loading.set(false);
    }
  }

  getModelsForProvider(provider: string): AiModel[] {
    return filterModelsForProvider(this.models(), provider);
  }

  private ensureValidSelection(): void {
    this.selectedModelId.set(
      selectValidModelId(
        this.models(),
        this.provider(),
        this.selectedModelId(),
      ),
    );
  }

  private resolveModel(provider: string, modelId: string): AiModel | null {
    return resolveCatalogModel(this.models(), provider, modelId);
  }

  private loadCookie(key: string, fallback: string): string {
    const fromCookie = readPrefCookie(this.cookies, key);
    if (fromCookie) return fromCookie;

    const migrated = migrateLocalStorageToCookie(key);
    if (migrated) {
      writePrefCookie(this.cookies, key, migrated);
      return migrated;
    }
    return fallback;
  }
}
