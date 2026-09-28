import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { ApiKeyService } from '@features/settings/services/api-key.service';
import { ElevenLabsCatalogService } from './elevenlabs-catalog.service';
import { scheduleIdleCallback } from './elevenlabs-idle.util';
import {
  loadStorageValue,
  resolveActiveProviderId,
  saveStorageValue,
  type TtsProviderMeta,
} from './elevenlabs-audio.util';

@Injectable({
  providedIn: 'root',
})
export class ElevenLabsVoiceService {
  private static readonly STORAGE_KEY_PROVIDER = 'tts_selected_provider';
  private static readonly STORAGE_KEY_VOICE = 'tts_selected_voice_id';
  private static readonly STORAGE_KEY_MODEL = 'tts_selected_model_id';
  private static readonly STORAGE_KEY_STT_MODEL = 'stt_selected_model_id';
  private static readonly IDLE_DEFER_MS = 1500;

  private readonly apiKeyService = inject(ApiKeyService);
  private readonly catalog = inject(ElevenLabsCatalogService);

  // Live catalog signals, re-exposed (same instances, template API unchanged).
  readonly providers = this.catalog.providers;
  readonly voices = this.catalog.voices;
  readonly ttsModels = this.catalog.ttsModels;
  readonly liveError = this.catalog.liveError;
  readonly loading = this.catalog.loading;

  readonly selectedProviderId = signal<string>(
    loadStorageValue(ElevenLabsVoiceService.STORAGE_KEY_PROVIDER, 'elevenlabs'),
  );
  readonly selectedVoiceId = signal<string>(
    loadStorageValue(ElevenLabsVoiceService.STORAGE_KEY_VOICE, ''),
  );
  readonly selectedModelId = signal<string>(
    loadStorageValue(ElevenLabsVoiceService.STORAGE_KEY_MODEL, ''),
  );
  readonly selectedSttModel = signal<string>(
    loadStorageValue(
      ElevenLabsVoiceService.STORAGE_KEY_STT_MODEL,
      'whisper-large-v3-turbo',
    ),
  );

  readonly currentProviderMeta = computed<TtsProviderMeta | undefined>(() =>
    this.catalog.resolveProviderMeta(this.selectedProviderId()),
  );

  constructor() {
    scheduleIdleCallback(
      () => this.bootstrapCatalog(),
      2500,
      ElevenLabsVoiceService.IDLE_DEFER_MS,
    );

    // Auto-select first voice when live voices load.
    effect(() => {
      const data = this.catalog.voices();
      if (
        data.length > 0 &&
        !data.some((v) => v.id === this.selectedVoiceId())
      ) {
        this.setVoiceId(data[0].id);
      }
    });

    // Auto-select model when live models load.
    effect(() => {
      const data = this.catalog.ttsModels();
      if (data.length > 0) {
        const meta = this.catalog.resolveProviderMeta(
          resolveActiveProviderId(this.selectedProviderId()),
        );
        const selected =
          data.find((m) => m.id === meta?.defaultModel) || data[0];
        if (!data.some((m) => m.id === this.selectedModelId())) {
          this.setModelId(selected.id);
        }
      } else {
        const meta = this.catalog.resolveProviderMeta(
          resolveActiveProviderId(this.selectedProviderId()),
        );
        if (meta?.defaultModel && !this.selectedModelId()) {
          this.setModelId(meta.defaultModel);
        }
      }
    });
  }

  private bootstrapCatalog(): void {
    const providerId = this.selectedProviderId();
    const meta = this.catalog.resolveProviderMeta(providerId);
    if (meta?.defaultModel && !this.selectedModelId()) {
      this.setModelId(meta.defaultModel);
    }
    this.catalog.ensureProvidersLoaded();
    const useServerKey = !this.apiKeyService.getKey(this.selectedProviderId());
    this.catalog.loadVoicesForProvider(this.selectedProviderId(), useServerKey);
    this.catalog.loadTtsModelsForProvider(
      this.selectedProviderId(),
      useServerKey,
    );
  }

  setVoiceId(id: string): void {
    this.selectedVoiceId.set(id);
    saveStorageValue(ElevenLabsVoiceService.STORAGE_KEY_VOICE, id);
  }

  setModelId(id: string): void {
    this.selectedModelId.set(id);
    saveStorageValue(ElevenLabsVoiceService.STORAGE_KEY_MODEL, id);
  }

  setSttModel(model: string): void {
    this.selectedSttModel.set(model);
    saveStorageValue(ElevenLabsVoiceService.STORAGE_KEY_STT_MODEL, model);
  }

  fetchProviders(): void {
    this.catalog.ensureProvidersLoaded();
  }

  setProviderId(providerId: string): void {
    this.selectedProviderId.set(providerId);
    saveStorageValue(ElevenLabsVoiceService.STORAGE_KEY_PROVIDER, providerId);
    if (providerId === 'default') {
      // Reset to elevenlabs defaults.
      this.selectedVoiceId.set('');
      saveStorageValue(ElevenLabsVoiceService.STORAGE_KEY_VOICE, '');
      const meta = this.catalog.resolveProviderMeta('default');
      if (meta?.defaultModel) {
        this.selectedModelId.set(meta.defaultModel);
        saveStorageValue(
          ElevenLabsVoiceService.STORAGE_KEY_MODEL,
          meta.defaultModel,
        );
      } else {
        this.selectedModelId.set('');
        saveStorageValue(ElevenLabsVoiceService.STORAGE_KEY_MODEL, '');
      }
    } else {
      const meta = this.catalog.resolveProviderMeta(providerId);
      if (meta) {
        // Reset selection; live voices/models will repopulate.
        this.selectedVoiceId.set('');
        saveStorageValue(ElevenLabsVoiceService.STORAGE_KEY_VOICE, '');
        if (meta.defaultModel) {
          this.selectedModelId.set(meta.defaultModel);
          saveStorageValue(
            ElevenLabsVoiceService.STORAGE_KEY_MODEL,
            meta.defaultModel,
          );
        }
      }
    }
    const useServerKey = !this.apiKeyService.getKey(
      resolveActiveProviderId(providerId),
    );
    this.catalog.loadVoicesForProvider(providerId, useServerKey);
    this.catalog.loadTtsModelsForProvider(providerId, useServerKey);
  }

  async loadVoicesForProvider(
    providerId?: string,
    useServerKey = false,
  ): Promise<void> {
    this.catalog.loadVoicesForProvider(
      providerId || this.selectedProviderId(),
      useServerKey,
    );
  }

  async loadTtsModelsForProvider(
    providerId?: string,
    useServerKey = false,
  ): Promise<void> {
    this.catalog.loadTtsModelsForProvider(
      providerId || this.selectedProviderId(),
      useServerKey,
    );
  }
}
