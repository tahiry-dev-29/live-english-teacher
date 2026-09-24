/**
 * Shared test double for TTS synthesis (no NestJS decorators so specs can
 * import it). Mirrors TtsSynthesizeService contracts: null when unavailable,
 * base64 mp3 on success.
 */

export interface TtsSynthesisResult {
  audioData: string;
  mimeType: string;
}

const MP3 = 'audio/mpeg';

export function mockFetchOk(body: object | ArrayBuffer): typeof fetch {
  return (async () =>
    ({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        body instanceof ArrayBuffer
          ? body
          : Buffer.from(JSON.stringify(body)).buffer,
      json: async () => body,
    }) as unknown as Response) as typeof fetch;
}

export function mockFetchFail(status = 401): typeof fetch {
  return (async () =>
    ({
      ok: false,
      status,
      text: async () => 'Error',
      arrayBuffer: async () => new ArrayBuffer(0),
    }) as unknown as Response) as typeof fetch;
}

export function mockFetchThrows(): typeof fetch {
  return (async () => {
    throw new Error('Network error');
  }) as typeof fetch;
}

export function mockElevenAudio(
  tag = 'eleven',
): (text: string) => Promise<TtsSynthesisResult> {
  return async (text: string) => ({
    audioData: Buffer.from(`${tag}:${text}`).toString('base64'),
    mimeType: MP3,
  });
}

/** Compact synthesis double: one generic audio POST + per-vendor parsing. */
export class DoubleSynth {
  constructor(
    private readonly elevenAudio: (
      text: string,
    ) => Promise<TtsSynthesisResult>,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  private async postAudio(url: string, body: unknown): Promise<Buffer | null> {
    try {
      const res = await this.fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  async elevenLabs(
    text: string,
    voiceId: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (apiKey) {
      const audio = await this.postAudio(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        { text },
      );
      if (audio) {
        return { audioData: audio.toString('base64'), mimeType: MP3 };
      }
    }
    return this.elevenAudio(text);
  }

  async openAi(
    text: string,
    voice: string,
    model: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    const audio = await this.postAudio(
      'https://api.openai.com/v1/audio/speech',
      { model, input: text, voice },
    );
    return audio ? { audioData: audio.toString('base64'), mimeType: MP3 } : null;
  }

  async azure(
    text: string,
    voice: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    const audio = await this.postAudio('https://azure.tts/v1', { text, voice });
    return audio ? { audioData: audio.toString('base64'), mimeType: MP3 } : null;
  }

  async google(
    text: string,
    voice: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    try {
      const res = await this.fetchFn('https://google.tts/v1', {
        method: 'POST',
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { audioContent?: string };
      return data.audioContent
        ? { audioData: data.audioContent, mimeType: MP3 }
        : null;
    } catch {
      return null;
    }
  }

  async polly(): Promise<TtsSynthesisResult | null> {
    return null;
  }

  async minimax(
    text: string,
    voice: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    try {
      const res = await this.fetchFn('https://api.minimax.chat/v1/t2a_v2', {
        method: 'POST',
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { data?: { audio?: string } };
      return data.data?.audio
        ? { audioData: data.data.audio, mimeType: MP3 }
        : null;
    } catch {
      return null;
    }
  }
}
