/**
 * Shared test double for Groq STT (no NestJS decorators so specs can
 * import it). Mirrors GroqTranscribeService contracts.
 */

export function mockFetchOk(text: string): typeof fetch {
  return (async () =>
    ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ text }),
      text: async () => JSON.stringify({ text }),
    }) as unknown as Response) as typeof fetch;
}

export function mockFetchError(status = 401): typeof fetch {
  return (async () =>
    ({
      ok: false,
      status,
      statusText: 'Unauthorized',
      text: async () => 'Error',
    }) as unknown as Response) as typeof fetch;
}

export function mockFetchThrows(): typeof fetch {
  return (async () => {
    throw new Error('Network error');
  }) as typeof fetch;
}

export function mockFetchCapture(
  onCall: (url: unknown, options: any) => void,
  text = 'ok',
): typeof fetch {
  return (async (url: unknown, options: any) => {
    onCall(url, options);
    return { ok: true, json: async () => ({ text }) } as unknown as Response;
  }) as typeof fetch;
}

export class DoubleTranscribe {
  private readonly model = 'whisper-large-v3-turbo';

  constructor(
    private readonly apiKey = '',
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async transcribe(
    audioData: string,
    mimeType = 'audio/webm',
    language?: string,
    modelOverride?: string,
    customApiKey?: string,
  ): Promise<string | null> {
    const key = customApiKey || this.apiKey;
    if (!key) return null;
    const selectedModel = modelOverride || this.model;
    const audioBuffer = Buffer.from(audioData, 'base64');
    const ext = mimeType.includes('wav')
      ? 'wav'
      : mimeType.includes('mp4') || mimeType.includes('m4a')
        ? 'm4a'
        : mimeType.includes('mp3') || mimeType.includes('mpeg')
          ? 'mp3'
          : 'webm';
    try {
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
      formData.append('model', selectedModel);
      formData.append('temperature', '0');
      if (language) formData.append('language', language);
      const response = await this.fetchFn(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}` },
          body: formData,
        },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as { text?: string };
      return data.text || null;
    } catch {
      return null;
    }
  }
}
