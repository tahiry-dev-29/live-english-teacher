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

  private readonly defaultModels: AiModel[] = [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      provider: 'groq',
      description: 'High intelligence & complex reasoning',
      size: '70B',
      isDefault: true,
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      provider: 'groq',
      description: 'Ultra-fast low-latency responses',
      size: '8B',
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'gemini',
      description: "Google's high speed & multimodal model",
      size: 'Flash',
      isDefault: true,
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'gemini',
      description: 'Next-gen multimodal reasoning',
      size: 'Flash',
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      description: 'Fast, affordable small model for focused tasks',
      size: 'Small',
      isDefault: true,
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      description: 'High intelligence and deep reasoning capabilities',
      size: 'Sonnet',
      isDefault: true,
    },
    {
      id: 'mistral-small-latest',
      name: 'Mistral Small',
      provider: 'mistral',
      description: 'Cost-efficient and high-performance multilingual model',
      size: 'Small',
      isDefault: true,
    },
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat (V3)',
      provider: 'deepseek',
      description: 'Powerful multilingual conversational model',
      size: 'V3',
      isDefault: true,
    },
    {
      id: 'qwen-plus',
      name: 'Qwen Plus',
      provider: 'qwen',
      description: 'Balanced performance, speed and multilingual accuracy',
      size: 'Plus',
      isDefault: true,
    },
  ];

  readonly models = signal<AiModel[]>(this.defaultModels);
  readonly loading = signal<boolean>(false);

  readonly provider = signal<string>(
    this.loadCookie(AiConfigService.COOKIE_PROVIDER, 'groq'),
  );

  readonly selectedModelId = signal<string>(
    this.loadCookie(AiConfigService.COOKIE_MODEL, 'llama-3.3-70b-versatile'),
  );

  readonly selectedModel = signal<AiModel>(
    this.resolveModel(this.provider(), this.selectedModelId()),
  );

  constructor() {
    this.fetchModels();

    effect(() => {
      const p = this.provider();
      const m = this.selectedModelId();
      writePrefCookie(this.cookies, AiConfigService.COOKIE_PROVIDER, p);
      writePrefCookie(this.cookies, AiConfigService.COOKIE_MODEL, m);
      this.selectedModel.set(this.resolveModel(p, m));
    });
  }

  async fetchModels(providerId?: string): Promise<void> {
    this.loading.set(true);
    try {
      const headers: Record<string, string> = {};
      const activeProvider = providerId || this.provider();
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
          this.models.set(fetched);
          this.ensureValidSelection();
        }
      }
    } catch (error) {
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

  private resolveModel(provider: string, modelId: string): AiModel {
    const list = this.models();
    const match = list.find((m) => m.id === modelId && m.provider === provider);
    if (match) return match;
    const providerModels = list.filter((m) => m.provider === provider);
    return providerModels[0] || this.defaultModels[0];
  }

  private loadCookie(key: string, fallback: string): string {
    // 1. Cookie = source de vérité.
    const fromCookie = readPrefCookie(this.cookies, key);
    if (fromCookie) return fromCookie;

    // 2. Migration one-shot depuis l'ancien localStorage, puis nettoyage.
    // Compat JSON.parse : les anciennes valeurs pouvaient être stockées
    // brutes ("groq") ou via JSON.stringify ('"groq"').
    const migrated = migrateLocalStorageToCookie(key);
    if (migrated) {
      writePrefCookie(this.cookies, key, migrated);
      return migrated;
    }
    return fallback;
  }
}
