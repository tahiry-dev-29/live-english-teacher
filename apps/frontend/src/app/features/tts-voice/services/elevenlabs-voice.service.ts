import { Injectable, signal, inject, computed } from '@angular/core';
import { MESSAGES } from '@core/constants/messages';
import { ApiKeyService } from '@features/settings/services/api-key.service';
import { API_URLS } from '@shared/constants/api-config';
import { LoggingService } from '@core/services/logging.service';
import { ElevenLabsCatalogService } from './elevenlabs-catalog.service';
import { scheduleIdleCallback } from './elevenlabs-idle.util';
import {
  buildTtsRequestBody,
  loadStorageValue,
  parseTtsAudioPayload,
  resolveActiveProviderId,
  saveStorageValue,
  type TtsAudioPayload,
  type TtsProviderMeta,
} from './elevenlabs-audio.util';

@Injectable({
  providedIn: 'root',
})
export class ElevenLabsVoiceService {
  private readonly logger = inject(LoggingService);
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
  }

  private bootstrapCatalog(): void {
    void this.fetchProviders();
    const useServerKey = !this.apiKeyService.getKey(this.selectedProviderId());
    void this.loadVoicesForProvider(this.selectedProviderId(), useServerKey);
    void this.loadTtsModelsForProvider(this.selectedProviderId(), useServerKey);
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

  fetchProviders(): Promise<void> {
    return this.catalog.fetchProviders();
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
    void this.loadVoicesForProvider(providerId, useServerKey);
    void this.loadTtsModelsForProvider(providerId, useServerKey);
  }

  async loadVoicesForProvider(
    providerId?: string,
    useServerKey = false,
  ): Promise<void> {
    const data = await this.catalog.loadVoicesForProvider(
      providerId || this.selectedProviderId(),
      useServerKey,
    );
    if (data.length > 0 && !data.some((v) => v.id === this.selectedVoiceId())) {
      this.setVoiceId(data[0].id);
    }
  }

  async loadTtsModelsForProvider(
    providerId?: string,
    useServerKey = false,
  ): Promise<void> {
    const data = await this.catalog.loadTtsModelsForProvider(
      providerId || this.selectedProviderId(),
      useServerKey,
    );
    if (data.length > 0 && !data.some((m) => m.id === this.selectedModelId())) {
      this.setModelId(data[0].id);
    }
  }

  async generateSpeechAudio(
    text: string,
    voiceId?: string,
    targetLanguage?: string,
  ): Promise<TtsAudioPayload | null> {
    const activeProvider = resolveActiveProviderId(this.selectedProviderId());
    const selectedVoice = voiceId || this.selectedVoiceId();
    const selectedModel = this.selectedModelId() || undefined;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.apiKeyService.getTtsHeaders(activeProvider),
      };
      const response = await fetch(API_URLS.tts, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          buildTtsRequestBody(
            activeProvider,
            selectedVoice,
            selectedModel,
            text,
            targetLanguage,
          ),
        ),
      });
      if (!response.ok) {
        this.logger.warn(
          MESSAGES.log.ttsRequestFailed,
          `HTTP ${response.status}: ${response.statusText}`,
        );
        return null;
      }
      return parseTtsAudioPayload(
        (await response.json()) as { audioData?: string; mimeType?: string },
      );
    } catch (error) {
      this.logger.warn(MESSAGES.log.ttsRequestFailed, error);
      return null;
    }
  }
}
