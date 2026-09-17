import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiKeyService {
  private static readonly STORAGE_KEY_CUSTOM_KEYS = 'custom_api_keys';
  private static readonly STORAGE_KEY_GROQ = 'custom_groq_api_key';
  private static readonly STORAGE_KEY_GEMINI = 'custom_gemini_api_key';

  readonly customKeys = signal<Record<string, string>>(this.loadAllKeys());

  readonly customGroqKey = computed<string>(
    () => this.customKeys()['groq'] || '',
  );
  readonly customGeminiKey = computed<string>(
    () => this.customKeys()['gemini'] || '',
  );

  readonly hasCustomGroqKey = computed<boolean>(
    () => this.customGroqKey().length > 0,
  );
  readonly hasCustomGeminiKey = computed<boolean>(
    () => this.customGeminiKey().length > 0,
  );

  getKey(provider: string): string {
    return this.customKeys()[provider] || '';
  }

  setKey(provider: string, key: string): void {
    const trimmed = key.trim();
    this.customKeys.update((keys) => {
      const updated = { ...keys };
      if (trimmed) {
        updated[provider] = trimmed;
      } else {
        delete updated[provider];
      }
      this.persistAllKeys(updated);
      return updated;
    });

    if (provider === 'groq') {
      this.persistLegacy(ApiKeyService.STORAGE_KEY_GROQ, trimmed);
    } else if (provider === 'gemini') {
      this.persistLegacy(ApiKeyService.STORAGE_KEY_GEMINI, trimmed);
    }
  }

  clearKey(provider: string): void {
    this.setKey(provider, '');
  }

  setGroqKey(key: string): void {
    this.setKey('groq', key);
  }

  setGeminiKey(key: string): void {
    this.setKey('gemini', key);
  }

  clearGroqKey(): void {
    this.clearKey('groq');
  }

  clearGeminiKey(): void {
    this.clearKey('gemini');
  }

  getKeyHeader(provider: string): string | undefined {
    return this.getKey(provider) || undefined;
  }

  getGroqKeyHeader(): string | undefined {
    return this.getKeyHeader('groq');
  }

  getGeminiKeyHeader(): string | undefined {
    return this.getKeyHeader('gemini');
  }

  private loadAllKeys(): Record<string, string> {
    const keys: Record<string, string> = {};
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(ApiKeyService.STORAGE_KEY_CUSTOM_KEYS);
        if (raw) {
          Object.assign(keys, JSON.parse(raw));
        }
        const groq = localStorage.getItem(ApiKeyService.STORAGE_KEY_GROQ);
        if (groq && !keys['groq']) keys['groq'] = groq;
        const gemini = localStorage.getItem(ApiKeyService.STORAGE_KEY_GEMINI);
        if (gemini && !keys['gemini']) keys['gemini'] = gemini;
      }
    } catch {
      // ignore
    }
    return keys;
  }

  private persistAllKeys(keys: Record<string, string>): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          ApiKeyService.STORAGE_KEY_CUSTOM_KEYS,
          JSON.stringify(keys),
        );
      }
    } catch {
      // ignore
    }
  }

  private persistLegacy(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        if (value) {
          localStorage.setItem(key, value);
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }
}

