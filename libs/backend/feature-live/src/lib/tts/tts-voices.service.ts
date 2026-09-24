import { Injectable } from '@nestjs/common';
import type { TtsVoiceInfo, TtsModelInfo } from './tts-providers.registry';

/** Live voice/model catalog per vendor (no mocks — [] when unavailable). */
@Injectable()
export class TtsVoicesService {
  async fetchAzureVoices(apiKey: string): Promise<TtsVoiceInfo[]> {
    const region = process.env['AZURE_SPEECH_REGION'] || 'eastus';
    try {
      const res = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
        { headers: { 'Ocp-Apim-Subscription-Key': apiKey } },
      );
      if (!res.ok) return [];
      const list = (await res.json()) as {
        ShortName: string;
        DisplayName: string;
        Locale: string;
        Gender: string;
      }[];
      return list.slice(0, 30).map((v) => ({
        id: v.ShortName,
        name: `${v.DisplayName} (${v.Locale})`,
        lang: v.Locale,
        gender: v.Gender.toLowerCase() as 'male' | 'female' | 'neutral',
        description: `Live Azure voice ${v.ShortName}`,
      }));
    } catch {
      return [];
    }
  }

  async fetchGoogleVoices(apiKey: string): Promise<TtsVoiceInfo[]> {
    try {
      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`,
      );
      if (!res.ok) return [];
      const body = (await res.json()) as {
        voices?: {
          name: string;
          languageCodes?: string[];
          ssmlGender?: string;
        }[];
      };
      return (body.voices || []).slice(0, 30).map((v) => ({
        id: v.name,
        name: `${v.name}`,
        lang: v.languageCodes?.[0] || 'en-US',
        gender: (v.ssmlGender || 'neutral').toLowerCase() as
          | 'male'
          | 'female'
          | 'neutral',
        description: `Live Google voice ${v.name}`,
      }));
    } catch {
      return [];
    }
  }

  /** OpenAI has no list endpoint: key validated live, documented voices out. */
  async fetchOpenAiVoices(apiKey: string): Promise<TtsVoiceInfo[]> {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const voices: [string, string, string][] = [
        ['alloy', 'Alloy', 'neutral'],
        ['echo', 'Echo', 'male'],
        ['fable', 'Fable', 'neutral'],
        ['onyx', 'Onyx', 'male'],
        ['nova', 'Nova', 'female'],
        ['shimmer', 'Shimmer', 'female'],
      ];
      return voices.map(([id, name, gender]) => ({
        id,
        name,
        lang: id === 'fable' ? 'en-GB' : 'en-US',
        gender: gender as 'male' | 'female' | 'neutral',
        description: `Live OpenAI voice ${name}`,
      }));
    } catch {
      return [];
    }
  }

  async fetchOpenAiTtsModels(apiKey: string): Promise<TtsModelInfo[]> {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: { id: string }[] };
      const list = (body.data || []).filter((m) =>
        m.id.toLowerCase().includes('tts'),
      );
      if (list.length === 0) {
        return [
          { id: 'tts-1', name: 'TTS-1 (Live)' },
          { id: 'tts-1-hd', name: 'TTS-1 HD (Live)' },
        ];
      }
      return list.map((m) => ({ id: m.id, name: `${m.id} (Live)` }));
    } catch {
      return [];
    }
  }
}
