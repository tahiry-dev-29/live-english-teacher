import { HttpClient, httpResource } from '@angular/common/http';
import {
  Injectable,
  signal,
  computed,
  effect,
  inject,
  DestroyRef,
} from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import {
  migrateLocalStorageToCookie,
  readPrefCookie,
  writePrefCookie,
} from '@core/utils/cookie.util';
import { ApiKeyService } from './api-key.service';
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
  private readonly http = inject(HttpClient);

  // Live-only: no hardcoded models. Starts empty, filled from /ai/models.
  readonly models = signal<AiModel[]>([]);

  readonly provider = signal<string>(
    this.loadCookie(AiConfigService.COOKIE_PROVIDER, 'groq'),
  );

  readonly selectedModelId = signal<string>(
    this.loadCookie(AiConfigService.COOKIE_MODEL, ''),
  );

  readonly selectedModel = computed(() =>
    this.resolveModel(this.provider(), this.selectedModelId()),
  );

  /** Resource state — replaces manual loading/fetchFailed/liveError signals. */
  private readonly modelsGate = signal(0);
  private readonly modelsGet = httpResource<AiModel[]>(() => {
    if (this.modelsGate() === 0) return undefined;
    const activeProvider = resolveActiveProvider(this.provider());
    const headers: Record<string, string> = {};
    if (activeProvider) headers['x-provider'] = activeProvider;
    const keys = this.apiKeyService.customKeys();
    for (const [p, k] of Object.entries(keys)) {
      if (k) headers[`x-${p}-api-key`] = k;
    }
    return { url: API_URLS.models, headers };
  });

  readonly loading = computed(() => this.modelsGet.isLoading());
  readonly liveError = computed<string | null>(() => {
    const err = this.modelsGet.error();
    if (!err) return null;
    if (typeof err === 'object' && err !== null && 'status' in err) {
      return `Live models unavailable (${(err as { status: number }).status}). Add an API key.`;
    }
    return 'Live models fetch failed. Check network / API key.';
  });
  readonly fetchFailed = computed<boolean>(() => {
    const err = this.modelsGet.error();
    return err !== undefined && this.modelsGet.hasValue();
  });

  constructor() {
    const idleHelper = new AiConfigIdleHelper(
      (provider, force) => this.fetchModels(provider, force),
      () => this.provider(),
      () => this.fetchFailed(),
      (_value) => {
        /* no-op — fetchFailed is now a computed signal */
      },
      () => this.liveError(),
      (_value) => {
        /* no-op — liveError is now a computed signal */
      },
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
    });

    // Merge server state into models signal
    effect(() => {
      const fetched = this.modelsGet.value();
      if (fetched && Array.isArray(fetched) && fetched.length > 0) {
        this.models.set(
          mergeLiveModels(
            this.models(),
            fetched,
            resolveActiveProvider(this.provider()),
          ),
        );
        this.ensureValidSelection();
      } else if (fetched !== undefined) {
        this.models.set(
          pruneProviderModels(
            this.models(),
            resolveActiveProvider(this.provider()),
          ),
        );
      }
    });
  }

  fetchModels(providerId?: string, force = false): void {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }
    if (!force && this.loading()) return;
    if (force) {
      this.modelsGate.update((n) => n + 1);
    } else {
      if (this.modelsGate() === 0) this.modelsGate.set(1);
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
