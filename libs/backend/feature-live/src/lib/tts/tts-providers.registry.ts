export interface TtsVoiceInfo {
  id: string;
  name: string;
  lang: string;
  gender?: 'male' | 'female' | 'neutral';
  description?: string;
  previewUrl?: string;
}

export interface TtsModelInfo {
  id: string;
  name: string;
  description?: string;
}

export interface TtsProviderConfig {
  id: string;
  label: string;
  quotaNote: string;
  quality: string;
  review: string;
  keyHeader: string;
  keyEnv: string;
  consoleUrl: string;
  defaultModel?: string;
  defaultVoiceId: string;
  hasCustomKeys: boolean;
  models?: TtsModelInfo[];
}

export const TTS_PROVIDERS_REGISTRY: Record<string, TtsProviderConfig> = {
  azure: {
    id: 'azure',
    label: 'Azure Speech',
    quotaNote: '500 000 chars/mo (free lifetime)',
    quality: 'Neural HD',
    review: 'Best choice (quota + natural voices)',
    keyHeader: 'x-azure-tts-key',
    keyEnv: 'AZURE_SPEECH_KEY',
    consoleUrl:
      'https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.CognitiveServices%2Faccounts',
    defaultModel: 'neural',
    defaultVoiceId: 'en-US-JennyNeural',
    hasCustomKeys: true,
  },
  google: {
    id: 'google',
    label: 'Google Cloud TTS',
    quotaNote: '1M to 4M chars/mo free',
    quality: 'Fluid Neural',
    review: 'Ultra generous volume',
    keyHeader: 'x-google-tts-key',
    keyEnv: 'GOOGLE_TTS_KEY',
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    defaultModel: 'Journey',
    defaultVoiceId: 'en-US-Journey-F',
    hasCustomKeys: true,
  },
  polly: {
    id: 'polly',
    label: 'AWS Polly',
    quotaNote: '1M to 5M chars/mo (12 mo free tier)',
    quality: 'Neural Standard',
    review: 'Free first 12 months',
    keyHeader: 'x-aws-polly-key',
    keyEnv: 'AWS_POLLY_KEY',
    consoleUrl: 'https://console.aws.amazon.com/polly/',
    defaultModel: 'neural',
    defaultVoiceId: 'Joanna',
    hasCustomKeys: true,
  },
  openai: {
    id: 'openai',
    label: 'OpenAI Audio',
    quotaNote: 'Paid (pay-as-you-go)',
    quality: 'Natural HD',
    review: 'High quality neural speech',
    keyHeader: 'x-openai-api-key',
    keyEnv: 'OPENAI_API_KEY',
    consoleUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'tts-1',
    defaultVoiceId: 'alloy',
    hasCustomKeys: true,
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax Audio',
    quotaNote: 'Trial credits available',
    quality: 'Expressive',
    review: 'Expressive and multilingual',
    keyHeader: 'x-minimax-tts-key',
    keyEnv: 'MINIMAX_API_KEY',
    consoleUrl: 'https://api.minimax.chat/',
    defaultModel: 'speech-01-turbo',
    defaultVoiceId: 'female-tutor-01',
    hasCustomKeys: true,
  },
  elevenlabs: {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    quotaNote: 'Account free/paid tier',
    quality: 'Ultra Natural',
    review: 'Industry leading voice cloning & naturalness',
    keyHeader: 'x-elevenlabs-api-key',
    keyEnv: 'ELEVENLABS_API_KEY',
    consoleUrl: 'https://elevenlabs.io/app/speech-synthesis',
    defaultModel: 'eleven_multilingual_v2',
    defaultVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
    hasCustomKeys: true,
  },
};

// NOTE: No FALLBACK_TTS_VOICES here by design.
// All TTS voices/models must come from live provider APIs.
// getVoices() returns [] when no key or live fetch fails so the UI
// prompts for a key instead of showing stale mocks.
