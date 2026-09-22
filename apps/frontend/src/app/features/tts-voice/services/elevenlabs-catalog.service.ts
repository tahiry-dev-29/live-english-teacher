import { Injectable, inject, signal } from '@angular/core';
import { ApiKeyService } from '@features/settings/services/api-key.service';
import { API_URLS } from '@shared/constants/api-config';
import {
  KNOWN_TTS_PROVIDERS,
  browserFallbackVoices,
  resolveActiveProviderId,
  type TtsModel,
  type TtsProviderMeta,
  type TtsVoice,
} from './elevenlabs-audio.util';

/**
 * Live TTS catalog (T94 split): providers/voices/models fetched from the
 * backend. Selection state stays in ElevenLabsVoiceService (facade).
 */
@Injectable({
  providedIn: 'root',
})
export class ElevenLabsCatalogService {
  private readonly apiKeyService = inject(ApiKeyService);

  readonly providers = signal<TtsProviderMeta[]>(KNOWN_TTS_PROVIDERS);
  /** Live-only: starts empty, filled from /ai/voices. No hardcoded voices. */
  readonly voices = signal<TtsVoice[]>([]);
  readonly ttsModels = signal<TtsModel[]>([]);
  readonly liveError = signal<string | null>(null);
  readonly loading = signal<boolean>(false);

  async fetchProviders(): Promise<void> {
    try {
      const res = await fetch(API_URLS.ttsProviders);
      if (res.ok) {
        const data = (await res.json()) as TtsProviderMeta[];
        if (Array.isArray(data) && data.length > 0) {
          this.providers.set(data);
        }
      }
    } catch {
      // keep static provider metadata (config, not mock voices)
    }
  }

  /** Return the TtsProviderMeta for a provider, resolving 'default'. */
  resolveProviderMeta(providerId: string): TtsProviderMeta | undefined {
    const resolved = resolveActiveProviderId(providerId);
    return this.providers().find((p) => p.id === resolved);
  }

  /** Fetch live voices; returns them (facade syncs its selection). */
  async loadVoicesForProvider(
    providerId: string,
    useServerKey = false,
  ): Promise<TtsVoice[]> {
    const activeProvider = resolveActiveProviderId(providerId);
    if (activeProvider === 'browser') {
      const fallback = browserFallbackVoices();
      this.voices.set(fallback);
      this.liveError.set(null);
      return fallback;
    }

    this.loading.set(true);
    this.liveError.set(null);
    try {
      const headers = this.apiKeyService.getTtsHeaders(
        activeProvider,
        useServerKey,
      );
      const res = await fetch(API_URLS.voices, { headers });
      if (res.ok) {
        const data = (await res.json()) as TtsVoice[];
        if (Array.isArray(data) && data.length > 0) {
          this.voices.set(data);
          return data;
        }
        this.voices.set([]);
        this.liveError.set('No live voices. Add an API key for this provider.');
        return [];
      }
      this.voices.set([]);
      this.liveError.set(
        `Live voices unavailable (${res.status}). Add an API key.`,
      );
      return [];
    } catch {
      this.voices.set([]);
      this.liveError.set('Live voices fetch failed. Check network / API key.');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /** Fetch live TTS models; returns them (facade syncs its selection). */
  async loadTtsModelsForProvider(
    providerId: string,
    useServerKey = false,
  ): Promise<TtsModel[]> {
    const activeProvider = resolveActiveProviderId(providerId);
    if (activeProvider === 'browser') {
      this.ttsModels.set([]);
      return [];
    }
    try {
      const headers = this.apiKeyService.getTtsHeaders(
        activeProvider,
        useServerKey,
      );
      const res = await fetch(API_URLS.ttsModels, { headers });
      if (res.ok) {
        const data = (await res.json()) as TtsModel[];
        if (Array.isArray(data) && data.length > 0) {
          this.ttsModels.set(data);
          return data;
        }
      }
      this.ttsModels.set([]);
      return [];
    } catch {
      this.ttsModels.set([]);
      return [];
    }
  }
}
