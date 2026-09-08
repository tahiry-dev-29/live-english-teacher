import { Injectable, signal, effect } from '@angular/core';

export type AiProvider = 'groq' | 'gemini';

export interface AiModel {
  id: string;
  name: string;
  provider: AiProvider;
  description: string;
  size?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AiConfigService {
  private static readonly STORAGE_KEY_PROVIDER = 'ai_provider';
  private static readonly STORAGE_KEY_MODEL = 'ai_model';

  readonly models: AiModel[] = [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', description: 'Most capable', size: '70B' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq', description: 'Fast & lightweight', size: '8B' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', description: "Google's latest", size: 'Flash' },
  ];

  readonly provider = signal<AiProvider>(this.loadFromStorage<AiProvider>(AiConfigService.STORAGE_KEY_PROVIDER, 'groq'));
  readonly selectedModelId = signal<string>(this.loadFromStorage<string>(AiConfigService.STORAGE_KEY_MODEL, 'llama-3.3-70b-versatile'));

  readonly selectedModel = signal<AiModel>(this.resolveModel(this.provider(), this.selectedModelId()));

  constructor() {
    effect(() => {
      const p = this.provider();
      const m = this.selectedModelId();
      localStorage.setItem(AiConfigService.STORAGE_KEY_PROVIDER, p);
      localStorage.setItem(AiConfigService.STORAGE_KEY_MODEL, m);
      this.selectedModel.set(this.resolveModel(p, m));
    });
  }

  getModelsForProvider(provider: AiProvider): AiModel[] {
    return this.models.filter((m) => m.provider === provider);
  }

  private resolveModel(provider: AiProvider, modelId: string): AiModel {
    const match = this.models.find((m) => m.id === modelId && m.provider === provider);
    return match ?? this.getModelsForProvider(provider)[0];
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
