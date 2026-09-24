import { Injectable, Logger } from '@nestjs/common';
import { BACKEND_MESSAGES } from '../../shared/messages';

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
  private readonly defaultVoiceId = 'JBFqnCBsd6RMkjVDRZzb';

  private serverKey(): string {
    return process.env['ELEVENLABS_API_KEY'] || '';
  }

  /** Live voices from ElevenLabs API. Returns [] when no key or fetch fails. */
  async getVoicesLive(customApiKey?: string): Promise<VoiceInfo[]> {
    const key = customApiKey || this.serverKey();
    if (!key) return [];
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': key },
      });
      if (!res.ok) return [];
      const body = (await res.json()) as { voices?: ElevenLabsVoiceRaw[] };
      const list = body.voices || [];
      return list.slice(0, 30).map((v) => ({
        id: v.voice_id,
        name: v.name,
        lang: v.labels?.language || 'en-US',
        previewUrl: v.preview_url,
        description:
          v.description || v.labels?.description || 'Live ElevenLabs voice',
      }));
    } catch (e) {
      this.logger.warn(`Live ElevenLabs voices fetch failed: ${e}`);
      return [];
    }
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
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/models', {
        headers: { 'xi-api-key': key },
      });
      if (!res.ok) return [];
      const body = (await res.json()) as {
        id?: string;
        name?: string;
        description?: string;
      }[];
      const list = Array.isArray(body) ? body : [];
      return list
        .map((m) => ({
          id: m.id || '',
          name: m.name || m.id || 'ElevenLabs model',
          description: m.description,
        }))
        .filter((m) => m.id);
    } catch {
      return [];
    }
  }

  async generateTtsAudio(
    text: string,
    voiceId?: string,
  ): Promise<{ audioData: string; mimeType: string } | null> {
    const apiKey = this.serverKey();
    if (!apiKey) {
      this.logger.warn(BACKEND_MESSAGES.log.elevenLabsKeyMissing);
      return null;
    }

    const selectedVoice = voiceId || this.defaultVoiceId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(
          `ElevenLabs API Error: ${response.status} - ${response.statusText}: ${errText}`,
        );
        if (selectedVoice !== this.defaultVoiceId) {
          return this.generateTtsAudio(text, this.defaultVoiceId);
        }
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const audioData = buffer.toString('base64');

      return {
        audioData,
        mimeType: 'audio/mpeg',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(BACKEND_MESSAGES.template.elevenLabsTtsFailed(msg));
      return null;
    }
  }
}
