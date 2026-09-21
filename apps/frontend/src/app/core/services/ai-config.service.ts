import { Injectable, signal, effect, inject } from '@angular/core';
import { environment } from '@environment';
import { CookieService } from 'ngx-cookie-service';
import {
  migrateLocalStorageToCookie,
  readPrefCookie,
  writePrefCookie,
} from '../utils/cookie.util';
import { ApiKeyService } from './api-key.service';
import { MESSAGES } from '@core/constants/messages';

export type AiProvider = string;

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  size?: string;
  contextWindow?: number;
  isDefault?: boolean;
}

export interface ProviderInfo {
  id: string;
  label: string;
  description: string;
  quotaBadge?: string;
  consoleUrl: string;
}

// Provider metadata (static config: label, console URL). Models are live-only.
export const KNOWN_PROVIDERS: ProviderInfo[] = [
  {
    id: 'groq',
    label: 'Groq',
    description: 'Ultra-fast inference engine',
    quotaBadge: 'Free Tier',
    consoleUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Google AI multimodal reasoning',
    quotaBadge: 'Free Tier',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o & GPT-4o-mini models',
    consoleUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude 3.5 Sonnet & Haiku models',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    description: 'Mistral Small & Large reasoning models',
    quotaBadge: 'Free Tier',
    consoleUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek-V3 & DeepSeek-R1 reasoning',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'qwen',
    label: 'Qwen',
    description: 'Alibaba Cloud Qwen multilingual models',
    quotaBadge: 'Free Tier',
    consoleUrl: 'https://dashscope.console.aliyun.com/apiKey',
  },
];

@Injectable({
  providedIn: 'root',
})
export class AiConfigService {
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
    this.scheduleIdleFetch();
    this.resubscribeOnReconnect();

    effect(() => {
      const p = this.provider();
      const m = this.selectedModelId();
      writePrefCookie(this.cookies, AiConfigService.COOKIE_PROVIDER, p);
      writePrefCookie(this.cookies, AiConfigService.COOKIE_MODEL, m);
      this.selectedModel.set(this.resolveModel(p, m));
    });
  }

  /** Chunked init (task 88): model list is only needed when the settings
   * dialog opens — fetch on browser idle so first paint stays API-free. */
  private scheduleIdleFetch(): void {
    if (typeof window === 'undefined') return;
    const run = (): void => {
      void this.fetchModels();
    };
    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => void;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      ric.call(window, run, { timeout: 2000 });
    } else {
      setTimeout(run, 1500);
    }
  }

  /** Offline (task 81): single refetch when the browser comes back online. */
  private resubscribeOnReconnect(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => {
      this.fetchFailed.set(false);
      this.liveError.set(null);
      void this.fetchModels(this.provider(), true);
    });
  }

  async fetchModels(providerId?: string, force = false): Promise<void> {
    if (this.loading()) return;

    const activeProvider = providerId || this.provider();

    if (!force && this.fetchFailed()) return;
    if (!force && this.lastFetchedProvider() === activeProvider) return;

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
      headers['x-provider'] = activeProvider;

      const keys = this.apiKeyService.customKeys();
      for (const [p, k] of Object.entries(keys)) {
        if (k) {
          headers[`x-${p}-api-key`] = k;
        }
      }

      const response = await fetch(`${environment.apiBaseUrl}/ai/models`, {
        headers,
      });
      if (response.ok) {
        const fetched = (await response.json()) as AiModel[];
        if (Array.isArray(fetched) && fetched.length > 0) {
          // Merge live results, keep other providers' live models.
          const others = this.models().filter(
            (m) => m.provider !== activeProvider,
          );
          const tagged = fetched.map((m) => ({
            ...m,
            provider: m.provider || activeProvider,
          }));
          this.models.set([...others, ...tagged]);
          this.lastFetchedProvider.set(activeProvider);
          this.ensureValidSelection();
        } else {
          // Live API returned empty: no mocks, surface empty + hint.
          this.models.set(
            this.models().filter((m) => m.provider !== activeProvider),
          );
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
      console.warn(MESSAGES.log.modelsFetchFailed, error);
    } finally {
      this.loading.set(false);
    }
  }

  getModelsForProvider(provider: string): AiModel[] {
    return this.models().filter((m) => m.provider === provider);
  }

  private ensureValidSelection(): void {
    const currentProvider = this.provider();
    const currentModelId = this.selectedModelId();
    const providerModels = this.getModelsForProvider(currentProvider);

    if (
      providerModels.length > 0 &&
      !providerModels.some((m) => m.id === currentModelId)
    ) {
      const defaultModel =
        providerModels.find((m) => m.isDefault) || providerModels[0];
      this.selectedModelId.set(defaultModel.id);
    }
  }

  private resolveModel(provider: string, modelId: string): AiModel | null {
    if (!modelId) return null;
    const list = this.models();
    const match = list.find((m) => m.id === modelId && m.provider === provider);
    if (match) return match;
    const providerModels = list.filter((m) => m.provider === provider);
    return providerModels[0] || null;
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
