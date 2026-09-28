import { httpResource } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiKeyService } from '@features/settings/services/api-key.service';
import { API_URLS } from '@shared/constants/api-config';
import {
  KNOWN_TTS_PROVIDERS,
  resolveActiveProviderId,
  type TtsModel,
  type TtsProviderMeta,
  type TtsVoice,
} from './elevenlabs-audio.util';

/**
 * Live TTS catalog: providers/voices/models fetched via httpResource.
 * Selection state stays in ElevenLabsVoiceService (facade).
 */
@Injectable({
  providedIn: 'root',
})
export class ElevenLabsCatalogService {
  private readonly apiKeyService = inject(ApiKeyService);

  /** Live voices — starts empty, filled from /ai/voices. */
  readonly voices = computed<TtsVoice[]>(() => this.voicesGet.value() ?? []);

  /** Live TTS models — starts empty, filled from /ai/tts-models. */
  readonly ttsModels = computed<TtsModel[]>(() => this.modelsGet.value() ?? []);

  /** Providers — live data when available, falls back to static metadata. */
  readonly providers = computed<TtsProviderMeta[]>(() => {
    return this.providersGet.value() ?? KNOWN_TTS_PROVIDERS;
  });

  readonly liveError = computed<string | null>(() => {
    const err =
      this.providersGet.error() ??
      this.voicesGet.error() ??
      this.modelsGet.error();
    if (!err) return null;
    if (typeof err === 'object' && err !== null && 'status' in err) {
      return `Catalog unavailable (${(err as { status: number }).status}).`;
    }
    return err instanceof Error ? err.message : 'Load failed.';
  });

  readonly loading = computed(
    () =>
      this.providersGet.isLoading() ||
      this.voicesGet.isLoading() ||
      this.modelsGet.isLoading(),
  );

  /** Gate: resource stays idle until ensureProvidersLoaded() flips it. */
  private readonly providersGate = signal(0);

  /** GET /ai/tts-providers → httpResource (reactive read, auto loading/error). */
  private readonly providersGet = httpResource<TtsProviderMeta[]>(() =>
    this.providersGate() === 0 ? undefined : { url: API_URLS.ttsProviders },
  );

  /** Gate + provider-dependent gate for voices. */
  private readonly voicesRequest = signal<{
    providerId: string;
    useServerKey: boolean;
  } | null>(null);

  /** GET /ai/voices → httpResource (dependent on provider). */
  private readonly voicesGet = httpResource<TtsVoice[]>(() => {
    const req = this.voicesRequest();
    if (!req) return undefined;
    return {
      url: API_URLS.voices,
      headers: this.apiKeyService.getTtsHeaders(
        resolveActiveProviderId(req.providerId),
        req.useServerKey,
      ),
    };
  });

  /** Gate + provider-dependent gate for models. */
  private readonly modelsRequest = signal<{
    providerId: string;
    useServerKey: boolean;
  } | null>(null);

  /** GET /ai/tts-models → httpResource (dependent on provider). */
  private readonly modelsGet = httpResource<TtsModel[]>(() => {
    const req = this.modelsRequest();
    if (!req) return undefined;
    return {
      url: API_URLS.ttsModels,
      headers: this.apiKeyService.getTtsHeaders(
        resolveActiveProviderId(req.providerId),
        req.useServerKey,
      ),
    };
  });

  /** Flip the gate: first call fires the GET, later calls are no-ops. */
  ensureProvidersLoaded(): void {
    if (this.providersGate() === 0) this.providersGate.set(1);
  }

  /** Load voices for a provider (triggers GET). */
  loadVoicesForProvider(providerId: string, useServerKey = false): void {
    this.voicesRequest.set({ providerId, useServerKey });
  }

  /** Load TTS models for a provider (triggers GET). */
  loadTtsModelsForProvider(providerId: string, useServerKey = false): void {
    this.modelsRequest.set({ providerId, useServerKey });
  }

  /** Return the TtsProviderMeta for a provider, resolving 'default'. */
  resolveProviderMeta(providerId: string): TtsProviderMeta | undefined {
    const resolved = resolveActiveProviderId(providerId);
    return this.providers().find((p) => p.id === resolved);
  }
}
