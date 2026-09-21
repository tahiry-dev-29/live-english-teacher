import { Injectable, Logger } from '@nestjs/common';
import {
  TTS_PROVIDERS_REGISTRY,
  TtsVoiceInfo,
  TtsProviderConfig,
  TtsModelInfo,
} from './tts-providers.registry';
import { ElevenLabsService } from '../elevenlabs/elevenlabs.service';

export interface TtsSynthesisResult {
  audioData: string;
  mimeType: string;
}

@Injectable()
export class TtsProviderService {
  private readonly logger = new Logger(TtsProviderService.name);

  constructor(private readonly elevenLabsService: ElevenLabsService) {}

  getProviders(): TtsProviderConfig[] {
    return Object.values(TTS_PROVIDERS_REGISTRY);
  }

  async getVoices(
    options: {
      provider?: string;
      apiKey?: string;
    } = {},
  ): Promise<TtsVoiceInfo[]> {
    const providerId = options.provider || 'elevenlabs';
    const config = TTS_PROVIDERS_REGISTRY[providerId];
    if (!config) return [];

    // Browser voices come from the client Web Speech API, not the server.
    if (providerId === 'browser') {
      return [
        {
          id: 'default',
          name: 'Browser Default Voice',
          lang: 'en-US',
          gender: 'neutral',
          description: 'System text-to-speech engine (Web Speech API)',
        },
      ];
    }

    const effectiveKey =
      options.apiKey || (config.keyEnv ? process.env[config.keyEnv] : '') || '';

    // Live-only: no mocks. Without a key, return [] so UI prompts for key.
    if (!effectiveKey) return [];

    if (providerId === 'azure') {
      const liveAzure = await this.fetchAzureVoices(effectiveKey);
      return liveAzure;
    }

    if (providerId === 'elevenlabs') {
      const live = await this.elevenLabsService.getVoicesLive(effectiveKey);
      return live.map((v) => ({
        id: v.id,
        name: v.name,
        lang: v.lang,
        description: v.description,
        previewUrl: v.previewUrl,
      }));
    }

    if (providerId === 'google') {
      return this.fetchGoogleVoices(effectiveKey);
    }

    if (providerId === 'openai') {
      return this.fetchOpenAiVoices(effectiveKey);
    }

    // Polly / MiniMax have no public list endpoint — no mocks, return [].
    return [];
  }

  /** Live TTS models per provider. Returns [] when unavailable. */
  async getTtsModels(
    options: { provider?: string; apiKey?: string } = {},
  ): Promise<TtsModelInfo[]> {
    const providerId = options.provider || 'elevenlabs';
    const config = TTS_PROVIDERS_REGISTRY[providerId];
    if (!config) return [];
    const effectiveKey =
      options.apiKey || (config.keyEnv ? process.env[config.keyEnv] : '') || '';
    if (!effectiveKey) return [];

    if (providerId === 'elevenlabs') {
      return this.elevenLabsService.getModelsLive(effectiveKey);
    }

    if (providerId === 'openai') {
      return this.fetchOpenAiTtsModels(effectiveKey);
    }

    if (
      providerId === 'google' ||
      providerId === 'azure' ||
      providerId === 'polly' ||
      providerId === 'minimax'
    ) {
      // These providers use fixed engine names; expose the configured default
      // as live config so UI can select it without stale mocks.
      if (config.defaultModel) {
        return [{ id: config.defaultModel, name: config.defaultModel }];
      }
      return [];
    }

    return [];
  }

  async synthesize(options: {
    provider?: string;
    voiceId?: string;
    modelId?: string;
    text: string;
    apiKey?: string;
    targetLanguage?: string;
  }): Promise<TtsSynthesisResult | null> {
    const rawProvider = options.provider || 'elevenlabs';
    const providerId = rawProvider === 'default' ? 'elevenlabs' : rawProvider;
    const config = TTS_PROVIDERS_REGISTRY[providerId];
    if (!config) return null;

    const effectiveKey =
      options.apiKey || (config.keyEnv ? process.env[config.keyEnv] : '') || '';

    switch (providerId) {
      case 'elevenlabs':
        return this.synthesizeElevenLabs(
          options.text,
          options.voiceId,
          effectiveKey,
          options.modelId,
        );
      case 'openai':
        return this.synthesizeOpenAi(
          options.text,
          options.voiceId || config.defaultVoiceId,
          options.modelId || config.defaultModel || 'tts-1',
          effectiveKey,
        );
      case 'azure':
        return this.synthesizeAzure(
          options.text,
          options.voiceId || config.defaultVoiceId,
          effectiveKey,
        );
      case 'google':
        return this.synthesizeGoogle(
          options.text,
          options.voiceId || config.defaultVoiceId,
          effectiveKey,
        );
      case 'polly':
        return this.synthesizePolly(options.voiceId || config.defaultVoiceId);
      case 'minimax':
        return this.synthesizeMiniMax(
          options.text,
          options.voiceId || config.defaultVoiceId,
          effectiveKey,
        );
      default:
        return null;
    }
  }

  private async synthesizeElevenLabs(
    text: string,
    voiceId?: string,
    customApiKey?: string,
    modelId?: string,
  ): Promise<TtsSynthesisResult | null> {
    if (customApiKey) {
      try {
        const selectedVoice = voiceId || 'JBFqnCBsd6RMkjVDRZzb';
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': customApiKey,
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: modelId || 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          return {
            audioData: Buffer.from(arrayBuffer).toString('base64'),
            mimeType: 'audio/mpeg',
          };
        }
      } catch (err) {
        this.logger.warn(`Custom ElevenLabs TTS failed: ${err}`);
      }
    }
    return this.elevenLabsService.generateTtsAudio(text, voiceId);
  }

  private async synthesizeOpenAi(
    text: string,
    voice: string,
    model: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'tts-1',
          input: text,
          voice: voice || 'alloy',
          response_format: 'mp3',
        }),
      });

      if (!res.ok) {
        this.logger.error(
          `OpenAI TTS error: ${res.status} - ${await res.text()}`,
        );
        return null;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      return {
        audioData: buffer.toString('base64'),
        mimeType: 'audio/mpeg',
      };
    } catch (e) {
      this.logger.error(`OpenAI TTS request failed: ${e}`);
      return null;
    }
  }

  private async synthesizeAzure(
    text: string,
    voice: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    const region = process.env['AZURE_SPEECH_REGION'] || 'eastus';
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `
      <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
        <voice name='${voice || 'en-US-JennyNeural'}'>
          ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </voice>
      </speak>
    `.trim();

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'live-english-teacher',
        },
        body: ssml,
      });

      if (!res.ok) {
        this.logger.error(
          `Azure TTS error: ${res.status} - ${await res.text()}`,
        );
        return null;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      return {
        audioData: buffer.toString('base64'),
        mimeType: 'audio/mpeg',
      };
    } catch (e) {
      this.logger.error(`Azure TTS request failed: ${e}`);
      return null;
    }
  }

  private async fetchAzureVoices(apiKey: string): Promise<TtsVoiceInfo[]> {
    const region = process.env['AZURE_SPEECH_REGION'] || 'eastus';
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
    try {
      const res = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey },
      });
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

  private async fetchGoogleVoices(apiKey: string): Promise<TtsVoiceInfo[]> {
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
      const list = body.voices || [];
      return list.slice(0, 30).map((v) => ({
        id: v.name,
        name: `${v.name}`,
        lang: v.languageCodes?.[0] || 'en-US',
        gender: (v.ssmlGender || 'neutral').toLowerCase() as
          'male' | 'female' | 'neutral',
        description: `Live Google voice ${v.name}`,
      }));
    } catch {
      return [];
    }
  }

  private async fetchOpenAiVoices(apiKey: string): Promise<TtsVoiceInfo[]> {
    // OpenAI has no voices list endpoint; validate key via live models call
    // then expose the documented live voices. Returns [] when key invalid.
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const docs: TtsVoiceInfo[] = [
        {
          id: 'alloy',
          name: 'Alloy',
          lang: 'en-US',
          gender: 'neutral',
          description: 'Live OpenAI voice Alloy',
        },
        {
          id: 'echo',
          name: 'Echo',
          lang: 'en-US',
          gender: 'male',
          description: 'Live OpenAI voice Echo',
        },
        {
          id: 'fable',
          name: 'Fable',
          lang: 'en-GB',
          gender: 'neutral',
          description: 'Live OpenAI voice Fable',
        },
        {
          id: 'onyx',
          name: 'Onyx',
          lang: 'en-US',
          gender: 'male',
          description: 'Live OpenAI voice Onyx',
        },
        {
          id: 'nova',
          name: 'Nova',
          lang: 'en-US',
          gender: 'female',
          description: 'Live OpenAI voice Nova',
        },
        {
          id: 'shimmer',
          name: 'Shimmer',
          lang: 'en-US',
          gender: 'female',
          description: 'Live OpenAI voice Shimmer',
        },
      ];
      return docs;
    } catch {
      return [];
    }
  }

  private async fetchOpenAiTtsModels(apiKey: string): Promise<TtsModelInfo[]> {
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

  private async synthesizeGoogle(
    text: string,
    voiceName: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const langCode = voiceName.split('-').slice(0, 2).join('-') || 'en-US';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: langCode, name: voiceName },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });

      if (!res.ok) {
        this.logger.error(`Google TTS error: ${res.status}`);
        return null;
      }

      const data = (await res.json()) as { audioContent?: string };
      if (data.audioContent) {
        return {
          audioData: data.audioContent,
          mimeType: 'audio/mpeg',
        };
      }
      return null;
    } catch (e) {
      this.logger.error(`Google TTS failed: ${e}`);
      return null;
    }
  }

  private async synthesizePolly(
    voiceId: string,
  ): Promise<TtsSynthesisResult | null> {
    this.logger.log(`Polly TTS invoked for voice ${voiceId}`);
    return null;
  }

  private async synthesizeMiniMax(
    text: string,
    voiceId: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    try {
      const res = await fetch('https://api.minimax.chat/v1/t2a_v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'speech-01-turbo',
          text,
          stream: false,
          voice_setting: {
            voice_id: voiceId || 'female-tutor-01',
            speed: 1.0,
            vol: 1.0,
            pitch: 0,
          },
        }),
      });

      if (!res.ok) return null;
      const data = (await res.json()) as { data?: { audio?: string } };
      if (data.data?.audio) {
        return {
          audioData: data.data.audio,
          mimeType: 'audio/mpeg',
        };
      }
      return null;
    } catch (e) {
      this.logger.error(`MiniMax TTS failed: ${e}`);
      return null;
    }
  }
}
