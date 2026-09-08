import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiKeyService {
  private static readonly STORAGE_KEY_GROQ = 'custom_groq_api_key';
  private static readonly STORAGE_KEY_GEMINI = 'custom_gemini_api_key';

  readonly customGroqKey = signal<string>(this.load(ApiKeyService.STORAGE_KEY_GROQ));
  readonly customGeminiKey = signal<string>(this.load(ApiKeyService.STORAGE_KEY_GEMINI));

  readonly hasCustomGroqKey = computed<boolean>(() => this.customGroqKey().length > 0);
  readonly hasCustomGeminiKey = computed<boolean>(() => this.customGeminiKey().length > 0);

  setGroqKey(key: string): void {
    const trimmed = key.trim();
    this.customGroqKey.set(trimmed);
    this.persist(ApiKeyService.STORAGE_KEY_GROQ, trimmed);
  }

  setGeminiKey(key: string): void {
    const trimmed = key.trim();
    this.customGeminiKey.set(trimmed);
    this.persist(ApiKeyService.STORAGE_KEY_GEMINI, trimmed);
  }

  clearGroqKey(): void {
    this.customGroqKey.set('');
    this.persist(ApiKeyService.STORAGE_KEY_GROQ, '');
  }

  clearGeminiKey(): void {
    this.customGeminiKey.set('');
    this.persist(ApiKeyService.STORAGE_KEY_GEMINI, '');
  }

  getGroqKeyHeader(): string | undefined {
    return this.customGroqKey() || undefined;
  }

  getGeminiKeyHeader(): string | undefined {
    return this.customGeminiKey() || undefined;
  }

  private persist(storageKey: string, value: string): void {
    if (value) {
      localStorage.setItem(storageKey, value);
    } else {
      localStorage.removeItem(storageKey);
    }
  }

  private load(storageKey: string): string {
    try {
      return localStorage.getItem(storageKey) ?? '';
    } catch {
      return '';
    }
  }
}
