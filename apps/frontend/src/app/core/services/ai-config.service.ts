import { Injectable, signal, effect, inject } from '@angular/core';
import { environment } from '@environment';
import { ApiKeyService } from './api-key.service';

export type AiProvider = 'groq' | 'gemini';

export interface AiModel {
  id: string;
  name: string;
  provider: AiProvider;
  description: string;
  size?: string;
  contextWindow?: number;
  isDefault?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AiConfigService {
  private static readonly STORAGE_KEY_PROVIDER = 'ai_provider';
  private static readonly STORAGE_KEY_MODEL = 'ai_model';

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
  ];

  readonly models = signal<AiModel[]>(this.defaultModels);
  readonly loading = signal<boolean>(false);

  readonly provider = signal<AiProvider>(
    this.loadFromStorage<AiProvider>(
      AiConfigService.STORAGE_KEY_PROVIDER,
      'groq'
    )
  );

  readonly selectedModelId = signal<string>(
    this.loadFromStorage<string>(
      AiConfigService.STORAGE_KEY_MODEL,
      'llama-3.3-70b-versatile'
    )
  );

  readonly selectedModel = signal<AiModel>(
    this.resolveModel(this.provider(), this.selectedModelId())
  );

  constructor() {
    this.fetchModels();

    effect(() => {
      const p = this.provider();
      const m = this.selectedModelId();
      localStorage.setItem(AiConfigService.STORAGE_KEY_PROVIDER, p);
      localStorage.setItem(AiConfigService.STORAGE_KEY_MODEL, m);
      this.selectedModel.set(this.resolveModel(p, m));
    });
  }

  async fetchModels(): Promise<void> {
    this.loading.set(true);
    try {
      const headers: Record<string, string> = {};
      const groqKey = this.apiKeyService.getGroqKeyHeader();
      const geminiKey = this.apiKeyService.getGeminiKeyHeader();
      if (groqKey) headers['x-groq-api-key'] = groqKey;
      if (geminiKey) headers['x-gemini-api-key'] = geminiKey;

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
      console.warn('Failed to fetch dynamic AI models, using defaults:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getModelsForProvider(provider: AiProvider): AiModel[] {
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

  private resolveModel(provider: AiProvider, modelId: string): AiModel {
    const list = this.models();
    const match = list.find((m) => m.id === modelId && m.provider === provider);
    if (match) return match;
    const providerModels = list.filter((m) => m.provider === provider);
    return providerModels[0] || this.defaultModels[0];
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
}
