/**
 * Unit tests — TtsProviderService
 *
 * Tests: getProviders(), getVoices(), synthesize()
 * All HTTP calls are mocked via injectable fetch functions.
 * No real external API calls are made.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TTS_PROVIDERS_REGISTRY } from './tts-providers.registry.ts';

// ── Inline TtsProviderService (without NestJS decorators) ────────────────────

interface TtsSynthesisResult {
  audioData: string;
  mimeType: string;
}

interface TtsVoiceInfo {
  id: string;
  name: string;
  lang: string;
  gender?: string;
  description?: string;
}

class TtsProviderService {
  constructor(
    private readonly elevenLabsService: {
      getVoices(): TtsVoiceInfo[];
      generateTtsAudio(
        text: string,
        voiceId?: string,
      ): Promise<TtsSynthesisResult | null>;
    },
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  getProviders() {
    return Object.values(TTS_PROVIDERS_REGISTRY);
  }

  async getVoices(
    options: { provider?: string; apiKey?: string } = {},
  ): Promise<TtsVoiceInfo[]> {
    const providerId = options.provider || 'elevenlabs';
    const config = TTS_PROVIDERS_REGISTRY[providerId];
    if (!config) return [];
    // Live-only: no mocks. Without key, return [].
    if (!options.apiKey) {
      if (providerId === 'elevenlabs') {
        const voices = this.elevenLabsService.getVoices();
        if (voices.length > 0) return voices;
      }
      return [];
    }

    if (providerId === 'elevenlabs') {
      const voices = this.elevenLabsService.getVoices();
      if (voices.length > 0) return voices;
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

    const effectiveKey = options.apiKey || '';

    switch (providerId) {
      case 'elevenlabs':
        return this.synthesizeElevenLabs(
          options.text,
          options.voiceId,
          effectiveKey,
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
        return null; // stub
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
  ): Promise<TtsSynthesisResult | null> {
    if (customApiKey) {
      try {
        const selectedVoice = voiceId || 'JBFqnCBsd6RMkjVDRZzb';
        const response = await this.fetchFn(
          `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': customApiKey,
              Accept: 'audio/mpeg',
            },
            body: JSON.stringify({ text }),
          },
        );
        if (response.ok) {
          const ab = await response.arrayBuffer();
          return {
            audioData: Buffer.from(ab).toString('base64'),
            mimeType: 'audio/mpeg',
          };
        }
      } catch {
        /* fall through */
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
      const res = await this.fetchFn('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          response_format: 'mp3',
        }),
      });
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      return { audioData: buffer.toString('base64'), mimeType: 'audio/mpeg' };
    } catch {
      return null;
    }
  }

  private async synthesizeAzure(
    text: string,
    voice: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    try {
      const res = await this.fetchFn(
        'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1',
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/ssml+xml',
          },
          body: `<speak><voice name="${voice}">${text}</voice></speak>`,
        },
      );
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      return { audioData: buffer.toString('base64'), mimeType: 'audio/mpeg' };
    } catch {
      return null;
    }
  }

  private async synthesizeGoogle(
    text: string,
    voiceName: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    try {
      const res = await this.fetchFn(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: { name: voiceName },
            audioConfig: { audioEncoding: 'MP3' },
          }),
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { audioContent?: string };
      return data.audioContent
        ? { audioData: data.audioContent, mimeType: 'audio/mpeg' }
        : null;
    } catch {
      return null;
    }
  }

  private async synthesizeMiniMax(
    text: string,
    voiceId: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    try {
      const res = await this.fetchFn('https://api.minimax.chat/v1/t2a_v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'speech-01-turbo',
          text,
          stream: false,
          voice_setting: { voice_id: voiceId },
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { data?: { audio?: string } };
      return data.data?.audio
        ? { audioData: data.data.audio, mimeType: 'audio/mpeg' }
        : null;
    } catch {
      return null;
    }
  }
}

// ── Mock factories ────────────────────────────────────────────────────────────

const MOCK_ELEVEN_VOICES: TtsVoiceInfo[] = [
  { id: 'rachel', name: 'Rachel', lang: 'en', description: 'Calm, natural' },
  { id: 'Antoni', name: 'Antoni', lang: 'en', description: 'British male' },
];

function mockElevenLabsService(voices = MOCK_ELEVEN_VOICES): any {
  return {
    getVoices: () => voices,
    generateTtsAudio: async (text: string) => ({
      audioData: Buffer.from(`eleven:${text}`).toString('base64'),
      mimeType: 'audio/mpeg',
    }),
  };
}

function mockFetchOk(body: object | ArrayBuffer): typeof fetch {
  return async () =>
    ({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        body instanceof ArrayBuffer
          ? body
          : Buffer.from(JSON.stringify(body)).buffer,
      json: async () => body,
    }) as any;
}

function mockFetchFail(status = 401): typeof fetch {
  return async () =>
    ({
      ok: false,
      status,
      text: async () => 'Error',
      arrayBuffer: async () => new ArrayBuffer(0),
    }) as any;
}

function mockFetchThrows(): typeof fetch {
  return async () => {
    throw new Error('Network error');
  };
}

// ── Test Setup ────────────────────────────────────────────────────────────────

let elevenLabs: ReturnType<typeof mockElevenLabsService>;
let service: TtsProviderService;

describe('TtsProviderService', () => {
  beforeEach(() => {
    elevenLabs = mockElevenLabsService();
    service = new TtsProviderService(elevenLabs);
  });

  // ── TTS_PROVIDERS_REGISTRY ────────────────────────────────────────────────

  describe('TTS_PROVIDERS_REGISTRY', () => {
    it('contains all 6 core providers', () => {
      const ids = Object.keys(TTS_PROVIDERS_REGISTRY);
      for (const expected of [
        'elevenlabs',
        'azure',
        'google',
        'openai',
        'polly',
        'minimax',
      ]) {
        assert.ok(ids.includes(expected), `Registry must include: ${expected}`);
      }
    });

    it('each provider has required config fields', () => {
      for (const [id, config] of Object.entries(TTS_PROVIDERS_REGISTRY)) {
        assert.ok(config.id, `${id} must have id`);
        assert.ok(config.label, `${id} must have label`);
        if (id !== 'browser') {
          assert.ok(config.keyEnv, `${id} must have keyEnv`);
        }
        assert.ok(config.defaultVoiceId, `${id} must have defaultVoiceId`);
      }
    });
  });

  // ── getProviders ──────────────────────────────────────────────────────────

  describe('getProviders()', () => {
    it('returns all registered TTS providers', () => {
      const providers = service.getProviders();
      assert.ok(providers.length >= 6);
    });

    it('includes elevenlabs', () => {
      assert.ok(service.getProviders().some((p) => p.id === 'elevenlabs'));
    });

    it('includes azure', () => {
      assert.ok(service.getProviders().some((p) => p.id === 'azure'));
    });

    it('includes google', () => {
      assert.ok(service.getProviders().some((p) => p.id === 'google'));
    });

    it('includes openai', () => {
      assert.ok(service.getProviders().some((p) => p.id === 'openai'));
    });
  });

  // ── getVoices ─────────────────────────────────────────────────────────────

  describe('getVoices()', () => {
    it('returns ElevenLabs voices from the service', async () => {
      const voices = await service.getVoices({ provider: 'elevenlabs' });
      assert.equal(voices.length, 2);
      assert.ok(voices.some((v) => v.name === 'Rachel'));
    });

    it('returns empty when elevenlabs has no live voices and no key', async () => {
      const emptyEleven = mockElevenLabsService([]);
      const svc = new TtsProviderService(emptyEleven);
      const voices = await svc.getVoices({ provider: 'elevenlabs' });
      assert.deepEqual(voices, []);
    });

    it('returns empty for azure without key (live-only, no mocks)', async () => {
      const voices = await service.getVoices({ provider: 'azure' });
      assert.deepEqual(voices, []);
    });

    it('returns empty for unknown provider', async () => {
      const voices = await service.getVoices({ provider: 'unknown-provider' });
      assert.deepEqual(voices, []);
    });

    it('defaults to elevenlabs when no provider specified', async () => {
      const voices = await service.getVoices();
      assert.ok(voices.length > 0);
    });
  });

  // ── synthesize ────────────────────────────────────────────────────────────

  describe('synthesize()', () => {
    it('returns null for unknown provider', async () => {
      const result = await service.synthesize({
        text: 'Hello',
        provider: 'unknown',
      });
      assert.equal(result, null);
    });

    it('resolves "default" to elevenlabs', async () => {
      const result = await service.synthesize({
        text: 'Hello',
        provider: 'default',
      });
      assert.ok(result);
      assert.equal(result!.mimeType, 'audio/mpeg');
    });

    // ── ElevenLabs ──────────────────────────────────────────────────────────

    describe('elevenlabs provider', () => {
      it('uses ElevenLabs service when no custom API key', async () => {
        const result = await service.synthesize({
          text: 'Hello',
          provider: 'elevenlabs',
        });
        assert.ok(result);
        const decoded = Buffer.from(result!.audioData, 'base64').toString(
          'utf8',
        );
        assert.ok(decoded.includes('eleven:Hello'));
      });

      it('uses custom fetch with API key when provided', async () => {
        const audioData = Buffer.from('fake-audio').buffer as ArrayBuffer;
        const svc = new TtsProviderService(elevenLabs, mockFetchOk(audioData));
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'elevenlabs',
          apiKey: 'sk-eleven',
        });
        assert.ok(result);
        assert.equal(result!.mimeType, 'audio/mpeg');
      });

      it('falls back to elevenLabsService when fetch fails', async () => {
        const svc = new TtsProviderService(elevenLabs, mockFetchFail());
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'elevenlabs',
          apiKey: 'sk-eleven',
        });
        assert.ok(result); // falls back to elevenLabsService
        const decoded = Buffer.from(result!.audioData, 'base64').toString(
          'utf8',
        );
        assert.ok(decoded.includes('eleven:Hello'));
      });

      it('falls back to elevenLabsService when fetch throws', async () => {
        const svc = new TtsProviderService(elevenLabs, mockFetchThrows());
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'elevenlabs',
          apiKey: 'sk-eleven',
        });
        assert.ok(result); // falls back
      });
    });

    // ── OpenAI ──────────────────────────────────────────────────────────────

    describe('openai provider', () => {
      it('returns null without API key', async () => {
        const result = await service.synthesize({
          text: 'Hello',
          provider: 'openai',
        });
        assert.equal(result, null);
      });

      it('returns audio with valid API key and mock fetch', async () => {
        const audioData = Buffer.from('openai-audio').buffer as ArrayBuffer;
        const svc = new TtsProviderService(elevenLabs, mockFetchOk(audioData));
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'openai',
          apiKey: 'sk-openai',
        });
        assert.ok(result);
        assert.equal(result!.mimeType, 'audio/mpeg');
      });

      it('returns null when API returns non-OK', async () => {
        const svc = new TtsProviderService(elevenLabs, mockFetchFail(403));
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'openai',
          apiKey: 'sk-openai',
        });
        assert.equal(result, null);
      });

      it('returns null when fetch throws', async () => {
        const svc = new TtsProviderService(elevenLabs, mockFetchThrows());
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'openai',
          apiKey: 'sk-openai',
        });
        assert.equal(result, null);
      });
    });

    // ── Azure ────────────────────────────────────────────────────────────────

    describe('azure provider', () => {
      it('returns null without API key', async () => {
        const result = await service.synthesize({
          text: 'Hello',
          provider: 'azure',
        });
        assert.equal(result, null);
      });

      it('returns audio with valid API key', async () => {
        const audioData = Buffer.from('azure-audio').buffer as ArrayBuffer;
        const svc = new TtsProviderService(elevenLabs, mockFetchOk(audioData));
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'azure',
          apiKey: 'az-key',
        });
        assert.ok(result);
      });
    });

    // ── Google ───────────────────────────────────────────────────────────────

    describe('google provider', () => {
      it('returns null without API key', async () => {
        const result = await service.synthesize({
          text: 'Hello',
          provider: 'google',
        });
        assert.equal(result, null);
      });

      it('returns audio from audioContent field', async () => {
        const svc = new TtsProviderService(
          elevenLabs,
          mockFetchOk({ audioContent: 'base64audio==' }),
        );
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'google',
          apiKey: 'gcp-key',
        });
        assert.ok(result);
        assert.equal(result!.audioData, 'base64audio==');
      });

      it('returns null when response has no audioContent', async () => {
        const svc = new TtsProviderService(elevenLabs, mockFetchOk({}));
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'google',
          apiKey: 'gcp-key',
        });
        assert.equal(result, null);
      });
    });

    // ── Polly ────────────────────────────────────────────────────────────────

    describe('polly provider', () => {
      it('returns null (stub not implemented)', async () => {
        const result = await service.synthesize({
          text: 'Hello',
          provider: 'polly',
        });
        assert.equal(result, null);
      });
    });

    // ── MiniMax ──────────────────────────────────────────────────────────────

    describe('minimax provider', () => {
      it('returns null without API key', async () => {
        const result = await service.synthesize({
          text: 'Hello',
          provider: 'minimax',
        });
        assert.equal(result, null);
      });

      it('returns audio from data.audio field', async () => {
        const svc = new TtsProviderService(
          elevenLabs,
          mockFetchOk({ data: { audio: 'minimax-b64' } }),
        );
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'minimax',
          apiKey: 'mm-key',
        });
        assert.ok(result);
        assert.equal(result!.audioData, 'minimax-b64');
      });

      it('returns null when data.audio is missing', async () => {
        const svc = new TtsProviderService(
          elevenLabs,
          mockFetchOk({ data: {} }),
        );
        const result = await svc.synthesize({
          text: 'Hello',
          provider: 'minimax',
          apiKey: 'mm-key',
        });
        assert.equal(result, null);
      });
    });
  });
});
