import { Injectable, Logger } from '@nestjs/common';
import type { TtsVoiceInfo, TtsModelInfo } from './tts-providers.registry';
import { getJson } from './tts-http.util';

/** Live voice/model catalog per vendor (axios + no mocks — [] when down). */
@Injectable()
export class TtsVoicesService {
  private readonly logger = new Logger(TtsVoicesService.name);

  async fetchAzureVoices(apiKey: string): Promise<TtsVoiceInfo[]> {
    const region = process.env['AZURE_SPEECH_REGION'] || 'eastus';
    const out = await getJson(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
      { 'Ocp-Apim-Subscription-Key': apiKey },
      this.logger,
      'Azure voices',
    );
    if (out.ok === false) {
      this.logger.warn(`Azure voices error: ${out.status} - ${out.body}`);
      return [];
    }
    const list = (out.data || []) as {
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
  }

  async fetchGoogleVoices(apiKey: string): Promise<TtsVoiceInfo[]> {
    const out = await getJson(
      `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`,
      {},
      this.logger,
      'Google voices',
    );
    if (out.ok === false) {
      this.logger.warn(`Google voices error: ${out.status} - ${out.body}`);
      return [];
    }
    const body = out.data as {
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
        'male' | 'female' | 'neutral',
      description: `Live Google voice ${v.name}`,
    }));
  }

  /** OpenAI has no list endpoint: key validated live, documented voices out. */
  async fetchOpenAiVoices(apiKey: string): Promise<TtsVoiceInfo[]> {
    const out = await getJson(
      'https://api.openai.com/v1/models',
      { Authorization: `Bearer ${apiKey}` },
      this.logger,
      'OpenAI voices',
    );
    if (out.ok === false) {
      this.logger.warn(`OpenAI voices error: ${out.status} - ${out.body}`);
      return [];
    }
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
  }

  async fetchOpenAiTtsModels(apiKey: string): Promise<TtsModelInfo[]> {
    const out = await getJson(
      'https://api.openai.com/v1/models',
      { Authorization: `Bearer ${apiKey}` },
      this.logger,
      'OpenAI models',
    );
    if (out.ok === false) {
      this.logger.warn(`OpenAI models error: ${out.status} - ${out.body}`);
      return [];
    }
    const body = out.data as { data?: { id: string }[] };
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
  }
}
