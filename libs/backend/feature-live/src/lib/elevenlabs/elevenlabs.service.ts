import { Injectable, Logger } from '@nestjs/common';

export interface VoiceInfo {
  id: string;
  name: string;
  lang: string;
  previewUrl?: string;
  description?: string;
}

export const ELEVENLABS_VOICES: VoiceInfo[] = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (Warm & Engaging)', lang: 'en-US', description: 'Deep, warm male voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Soft & Natural)', lang: 'en-US', description: 'Calm, friendly female voice' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Dynamic & Clear)', lang: 'en-US', description: 'Energetic male voice' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Crisp & Crisp)', lang: 'en-US', description: 'Authoritative male voice' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Smooth & Conversational)', lang: 'en-US', description: 'Natural conversational male voice' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Deep & Professional)', lang: 'en-GB', description: 'British accent male voice' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica (Bright & Clear)', lang: 'en-US', description: 'Young playful female voice' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris (Casual & Friendly)', lang: 'en-US', description: 'Casual conversational voice' },
];

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly apiKey = process.env['ELEVENLABS_API_KEY'] || '';
  private readonly defaultVoiceId = 'JBFqnCBsd6RMkjVDRZzb'; // George (Free default supported)

  getVoices(): VoiceInfo[] {
    return ELEVENLABS_VOICES;
  }

  async generateTtsAudio(
    text: string,
    voiceId?: string
  ): Promise<{ audioData: string; mimeType: string } | null> {
    if (!this.apiKey) {
      this.logger.warn('ELEVENLABS_API_KEY is not configured.');
      return null;
    }

    const selectedVoice = voiceId || this.defaultVoiceId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
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
          `ElevenLabs API Error: ${response.status} - ${response.statusText}: ${errText}`
        );
        // Fallback to George if chosen voice fails
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
      this.logger.error(`Failed to generate ElevenLabs TTS: ${msg}`);
      return null;
    }
  }
}
