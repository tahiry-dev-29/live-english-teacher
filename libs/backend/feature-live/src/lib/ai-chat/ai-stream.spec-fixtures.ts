/** Mock factories for ai-stream specs (task 98 split). */
export {
  AiStreamController,
  ChatHistoryService,
  MockPrismaService,
} from './ai-stream-doubles.spec-helper.ts';

export function makeMockModels() {
  return {
    getModels: async ({ keys }: { keys?: Record<string, string> } = {}) => [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'gemini',
        description: 'Google AI',
        isDefault: true,
      },
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3',
        provider: 'groq',
        description: keys?.groq ? 'Groq (auth)' : 'Groq',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'OpenAI',
      },
    ],
  };
}

export function makeMockTts() {
  return {
    getProviders: () => [
      {
        id: 'elevenlabs',
        label: 'ElevenLabs',
        quotaNote: '10k chars/mo',
        quality: 'High',
      },
      {
        id: 'azure',
        label: 'Azure Speech',
        quotaNote: '500k chars/mo',
        quality: 'Neural HD',
      },
      {
        id: 'openai',
        label: 'OpenAI TTS',
        quotaNote: 'Pay-per-use',
        quality: 'Natural',
      },
      {
        id: 'google',
        label: 'Google Cloud TTS',
        quotaNote: '1M chars/mo',
        quality: 'Fluid',
      },
      {
        id: 'polly',
        label: 'AWS Polly',
        quotaNote: '5M chars/mo (free)',
        quality: 'Standard',
      },
      {
        id: 'minimax',
        label: 'MiniMax',
        quotaNote: 'Limited',
        quality: 'Neural',
      },
    ],
    getVoices: async ({ provider }: { provider?: string }) => {
      if (provider === 'elevenlabs') {
        return [
          {
            id: 'rachel',
            name: 'Rachel',
            lang: 'en',
            description: 'Calm, natural',
          },
          {
            id: 'Antoni',
            name: 'Antoni',
            lang: 'en',
            description: 'British male',
          },
        ];
      }
      if (provider === 'azure') {
        return [
          { id: 'en-US-JennyNeural', name: 'Jenny (en-US)', lang: 'en-US' },
        ];
      }
      return [];
    },
    synthesize: async ({ text, provider }: { text?: string; provider?: string }) => {
      if (!text) return null;
      return {
        audioData: Buffer.from(`audio:${provider || 'el'}:${text}`).toString(
          'base64',
        ),
        mimeType: 'audio/mpeg',
      };
    },
  };
}

export function makeMockTranscribe() {
  return {
    transcribe: async (
      audioData: string,
      _mimeType?: string,
      _lang?: string,
      _model?: string,
      _key?: string,
    ) => {
      if (audioData === 'INVALID_AUDIO') return null;
      if (!audioData) return null;
      return 'The quick brown fox jumps over the lazy dog';
    },
  };
}

export function makeMockAiProvider() {
  return {
    generateStreamText: async function* (_history: unknown[], content: string) {
      yield `Response to: ${content.substring(0, 20)}`;
    },
  };
}

