/** Pure ElevenLabs/TTS-provider helpers (T94 split, no Angular deps). */

export interface TtsVoice {
  id: string;
  name: string;
  lang: string;
  gender?: 'male' | 'female' | 'neutral';
  description?: string;
  previewUrl?: string;
}

export interface TtsModel {
  id: string;
  name: string;
  description?: string;
}

export interface TtsProviderMeta {
  id: string;
  label: string;
  quotaNote: string;
  quality: string;
  review: string;
  keyHeader: string;
  consoleUrl: string;
  defaultModel?: string;
  defaultVoiceId: string;
  hasCustomKeys: boolean;
}

// Provider metadata only (static config). Voices + models are live-only.
export const KNOWN_TTS_PROVIDERS: TtsProviderMeta[] = [
  {
    id: 'azure',
    label: 'Azure Speech',
    quotaNote: '500 000 chars/mo (free lifetime)',
    quality: 'Neural HD',
    review: 'Best choice (quota + natural voices)',
    keyHeader: 'x-azure-tts-key',
    consoleUrl:
      'https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.CognitiveServices%2Faccounts',
    defaultModel: 'neural',
    defaultVoiceId: 'en-US-JennyNeural',
    hasCustomKeys: true,
  },
  {
    id: 'google',
    label: 'Google Cloud TTS',
    quotaNote: '1M to 4M chars/mo free',
    quality: 'Fluid Neural',
    review: 'Ultra generous volume',
    keyHeader: 'x-google-tts-key',
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    defaultModel: 'Journey',
    defaultVoiceId: 'en-US-Journey-F',
    hasCustomKeys: true,
  },
  {
    id: 'polly',
    label: 'AWS Polly',
    quotaNote: '1M to 5M chars/mo (12 mo free tier)',
    quality: 'Neural Standard',
    review: 'Free first 12 months',
    keyHeader: 'x-aws-polly-key',
    consoleUrl: 'https://console.aws.amazon.com/polly/',
    defaultModel: 'neural',
    defaultVoiceId: 'Joanna',
    hasCustomKeys: true,
  },
  {
    id: 'openai',
    label: 'OpenAI Audio',
    quotaNote: 'Paid (pay-as-you-go)',
    quality: 'Natural HD',
    review: 'High quality neural speech',
    keyHeader: 'x-openai-api-key',
    consoleUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'tts-1',
    defaultVoiceId: 'alloy',
    hasCustomKeys: true,
  },
  {
    id: 'minimax',
    label: 'MiniMax Audio',
    quotaNote: 'Trial credits available',
    quality: 'Expressive',
    review: 'Expressive and multilingual',
    keyHeader: 'x-minimax-tts-key',
    consoleUrl: 'https://api.minimax.chat/',
    defaultModel: 'speech-01-turbo',
    defaultVoiceId: 'female-tutor-01',
    hasCustomKeys: true,
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    quotaNote: 'Account free/paid tier',
    quality: 'Ultra Natural',
    review: 'Industry leading voice cloning & naturalness',
    keyHeader: 'x-elevenlabs-api-key',
    consoleUrl: 'https://elevenlabs.io/app/speech-synthesis',
    defaultModel: 'eleven_multilingual_v2',
    defaultVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
    hasCustomKeys: true,
  },
  {
    id: 'browser',
    label: 'Web Speech (Browser)',
    quotaNote: 'Unlimited local',
    quality: 'System Voice',
    review: 'Always available offline fallback',
    keyHeader: '',
    consoleUrl: '',
    defaultModel: '',
    defaultVoiceId: '',
    hasCustomKeys: false,
  },
];

/** 'default' means the server default (elevenlabs). */
export function resolveActiveProviderId(providerId: string): string {
  return providerId === 'default' ? 'elevenlabs' : providerId;
}

/** Fallback voice entry used when the provider is the local browser engine. */
export function browserFallbackVoices(): TtsVoice[] {
  return [
    {
      id: 'default',
      name: 'Browser Default Voice',
      lang: 'en-US',
      description: 'System text-to-speech engine (Web Speech API)',
    },
  ];
}

export interface TtsRequestBody {
  provider?: string;
  voiceId: string;
  modelId?: string;
  text: string;
  targetLanguage?: string;
}

/** Request payload for POST /ai/tts (server-default omits `provider`). */
export function buildTtsRequestBody(
  providerId: string,
  voiceId: string,
  modelId: string | undefined,
  text: string,
  targetLanguage?: string,
): TtsRequestBody {
  return {
    ...(providerId === 'default' ? {} : { provider: providerId }),
    voiceId,
    modelId,
    text,
    targetLanguage,
  };
}

export interface TtsAudioPayload {
  audioData: string;
  mimeType: string;
}

/** Normalize the POST /ai/tts JSON response; null when unusable. */
export function parseTtsAudioPayload(data: {
  audioData?: string;
  mimeType?: string;
}): TtsAudioPayload | null {
  if (!data?.audioData) return null;
  return { audioData: data.audioData, mimeType: data.mimeType || 'audio/mpeg' };
}

/** localStorage read guarded for SSR / private-mode throws. */
export function loadStorageValue(key: string, fallback: string): string {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) || fallback;
    }
  } catch {
    // ignore
  }
  return fallback;
}

/** localStorage write guarded for SSR / private-mode throws. */
export function saveStorageValue(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
}
