import { Injectable, Logger } from '@nestjs/common';
import { BACKEND_MESSAGES } from '../../shared/messages';
import { TTS_PROVIDERS_REGISTRY } from '../tts-providers.registry';
import { audioSuccess, getJson, postForAudio } from '../tts-http.util';
import {
  classifyTtsFailure,
  missingKeyFailure,
  planDefaultRetry,
  type TtsSynthesisOutcome,
} from '../tts-failure.util';

export interface VoiceInfo {
  id: string;
  name: string;
  lang: string;
  previewUrl?: string;
  description?: string;
}

interface ElevenLabsVoiceRaw {
  voice_id: string;
  name: string;
  labels?: { language?: string; gender?: string; description?: string };
  preview_url?: string;
  description?: string;
}

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly config = TTS_PROVIDERS_REGISTRY['elevenlabs'];
  private readonly defaultVoiceId = this.config.defaultVoiceId;
  private readonly defaultModelId =
    this.config.defaultModel || 'eleven_multilingual_v2';

  private serverKey(): string {
    return process.env['ELEVENLABS_API_KEY'] || '';
  }

  /** Live voices from ElevenLabs API. Returns [] when no key or fetch fails. */
  async getVoicesLive(customApiKey?: string): Promise<VoiceInfo[]> {
    const key = customApiKey || this.serverKey();
    if (!key) return [];
    const out = await getJson(
      'https://api.elevenlabs.io/v1/voices',
      { 'xi-api-key': key },
      this.logger,
      'ElevenLabs voices',
    );
    if (out.ok === false) {
      // 401 "missing the permission" (voices_read) is reported, not swallowed.
      this.logger.warn(
        `${BACKEND_MESSAGES.log.elevenLabsVoicesFailed} ${out.status} - ${out.body}`,
      );
      return [];
    }
    const body = out.data as { voices?: ElevenLabsVoiceRaw[] };
    const list = body?.voices || [];
    return list.slice(0, 30).map((v) => ({
      id: v.voice_id,
      name: v.name,
      lang: v.labels?.language || 'en-US',
      previewUrl: v.preview_url,
      description:
        v.description || v.labels?.description || 'Live ElevenLabs voice',
    }));
  }

  /** Sync compat: returns [] — callers must use getVoicesLive(). */
  getVoices(): VoiceInfo[] {
    return [];
  }

  /** Live TTS models from ElevenLabs API. Returns [] when unavailable. */
  async getModelsLive(
    customApiKey?: string,
  ): Promise<{ id: string; name: string; description?: string }[]> {
    const key = customApiKey || this.serverKey();
    if (!key) return [];
    const out = await getJson(
      'https://api.elevenlabs.io/v1/models',
      { 'xi-api-key': key },
      this.logger,
      'ElevenLabs models',
    );
    if (out.ok === false) {
      this.logger.warn(
        `${BACKEND_MESSAGES.log.elevenLabsModelsFailed} ${out.status} - ${out.body}`,
      );
      return [];
    }
    const list = Array.isArray(out.data)
      ? (out.data as { id?: string; name?: string; description?: string }[])
      : [];
    return list
      .map((m) => ({
        id: m.id || '',
        name: m.name || m.id || 'ElevenLabs model',
        description: m.description,
      }))
      .filter((m) => m.id);
  }

  /** One upstream attempt — status + body are classified, never swallowed. */
  private async requestTts(
    text: string,
    voiceId: string,
    apiKey: string,
    modelId?: string,
  ): Promise<TtsSynthesisOutcome> {
    const out = await postForAudio(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: modelId || this.defaultModelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      { 'xi-api-key': apiKey, Accept: 'audio/mpeg' },
      this.logger,
      'ElevenLabs TTS',
    );
    if (out.ok === false)
      return classifyTtsFailure('elevenlabs', out.status, out.body);
    return audioSuccess(out.data);
  }

  /**
   * Live TTS audio for the given voice/model.
   * A stale voice or model id must not kill playback: retry once with the
   * registry defaults. Quota/key failures are returned as-is (no wasted calls).
   */
  async generateTtsAudio(
    text: string,
    voiceId?: string,
    customApiKey?: string,
    modelId?: string,
  ): Promise<TtsSynthesisOutcome> {
    const apiKey = customApiKey || this.serverKey();
    if (!apiKey) {
      this.logger.warn(BACKEND_MESSAGES.log.elevenLabsKeyMissing);
      return missingKeyFailure('elevenlabs');
    }

    const voice = voiceId || this.defaultVoiceId;
    const first = await this.requestTts(text, voice, apiKey, modelId);
    if (first.ok === true) return first;

    const retry = planDefaultRetry(
      first,
      { voiceId: voice, modelId },
      { voiceId: this.defaultVoiceId, modelId: this.defaultModelId },
    );
    if (!retry) return first;

    this.logger.warn(
      `ElevenLabs voice/model unavailable (${first.detail ?? first.code}) — retrying with defaults`,
    );
    return this.requestTts(text, retry.voiceId, apiKey, retry.modelId);
  }
}
