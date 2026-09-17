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
    quality: '⭐⭐⭐⭐⭐ Neural',
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
    quality: '⭐⭐⭐⭐ Fluid',
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
    quality: '⭐⭐⭐ Good to very good',
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
    quality: '⭐⭐⭐⭐⭐ Natural',
    review: 'High quality neural speech',
    keyHeader: 'x-openai-api-key',
    keyEnv: 'OPENAI_API_KEY',
    consoleUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'tts-1',
    defaultVoiceId: 'alloy',
    hasCustomKeys: true,
    models: [
      { id: 'tts-1', name: 'TTS-1 (Standard, low latency)' },
      { id: 'tts-1-hd', name: 'TTS-1 HD (High Definition)' },
    ],
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax Audio',
    quotaNote: 'Trial credits available',
    quality: '⭐⭐⭐⭐ Expressive',
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
    quality: '⭐⭐⭐⭐⭐ Ultra Natural',
    review: 'Industry leading voice cloning & naturalness',
    keyHeader: 'x-elevenlabs-api-key',
    keyEnv: 'ELEVENLABS_API_KEY',
    consoleUrl: 'https://elevenlabs.io/app/speech-synthesis',
    defaultModel: 'eleven_multilingual_v2',
    defaultVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
    hasCustomKeys: true,
  },
  browser: {
    id: 'browser',
    label: 'Web Speech (Browser)',
    quotaNote: 'Unlimited local',
    quality: '⭐⭐ Dependent on OS',
    review: 'Always available offline fallback',
    keyHeader: '',
    keyEnv: '',
    consoleUrl: '',
    defaultVoiceId: 'default',
    hasCustomKeys: false,
  },
};

export const FALLBACK_TTS_VOICES: Record<string, TtsVoiceInfo[]> = {
  elevenlabs: [
    {
      id: 'JBFqnCBsd6RMkjVDRZzb',
      name: 'George (Warm & Engaging)',
      lang: 'en-US',
      gender: 'male',
      description: 'Deep, warm male voice',
    },
    {
      id: 'EXAVITQu4vr4xnSDxMaL',
      name: 'Sarah (Soft & Natural)',
      lang: 'en-US',
      gender: 'female',
      description: 'Calm, friendly female voice',
    },
    {
      id: 'ErXwobaYiN019PkySvjV',
      name: 'Antoni (Dynamic & Clear)',
      lang: 'en-US',
      gender: 'male',
      description: 'Energetic male voice',
    },
    {
      id: 'VR6AewLTigWG4xSOukaG',
      name: 'Arnold (Crisp & Clear)',
      lang: 'en-US',
      gender: 'male',
      description: 'Authoritative male voice',
    },
    {
      id: 'pNInz6obpgDQGcFmaJgB',
      name: 'Adam (Smooth & Natural)',
      lang: 'en-US',
      gender: 'male',
      description: 'Conversational male voice',
    },
    {
      id: 'onwK4e9ZLuTAKqWW03F9',
      name: 'Daniel (Deep British)',
      lang: 'en-GB',
      gender: 'male',
      description: 'Professional British male',
    },
    {
      id: 'cgSgspJ2msm6clMCkdW9',
      name: 'Jessica (Bright & Playful)',
      lang: 'en-US',
      gender: 'female',
      description: 'Young friendly female',
    },
    {
      id: 'iP95p4xoKVk53GoZ742B',
      name: 'Chris (Casual & Friendly)',
      lang: 'en-US',
      gender: 'male',
      description: 'Casual conversational voice',
    },
  ],
  openai: [
    {
      id: 'alloy',
      name: 'Alloy',
      lang: 'en-US',
      gender: 'neutral',
      description: 'Balanced, neutral voice',
    },
    {
      id: 'echo',
      name: 'Echo',
      lang: 'en-US',
      gender: 'male',
      description: 'Warm and rounded male voice',
    },
    {
      id: 'fable',
      name: 'Fable',
      lang: 'en-GB',
      gender: 'neutral',
      description: 'Expressive British voice',
    },
    {
      id: 'onyx',
      name: 'Onyx',
      lang: 'en-US',
      gender: 'male',
      description: 'Deep, authoritative male voice',
    },
    {
      id: 'nova',
      name: 'Nova',
      lang: 'en-US',
      gender: 'female',
      description: 'Energetic, friendly female voice',
    },
    {
      id: 'shimmer',
      name: 'Shimmer',
      lang: 'en-US',
      gender: 'female',
      description: 'Clear, bright female voice',
    },
  ],
  azure: [
    {
      id: 'en-US-JennyNeural',
      name: 'Jenny (US Neural)',
      lang: 'en-US',
      gender: 'female',
      description: 'Natural conversational American female',
    },
    {
      id: 'en-US-GuyNeural',
      name: 'Guy (US Neural)',
      lang: 'en-US',
      gender: 'male',
      description: 'Natural conversational American male',
    },
    {
      id: 'en-GB-SoniaNeural',
      name: 'Sonia (UK Neural)',
      lang: 'en-GB',
      gender: 'female',
      description: 'Polite British female',
    },
    {
      id: 'en-GB-RyanNeural',
      name: 'Ryan (UK Neural)',
      lang: 'en-GB',
      gender: 'male',
      description: 'Professional British male',
    },
    {
      id: 'fr-FR-DeniseNeural',
      name: 'Denise (FR Neural)',
      lang: 'fr-FR',
      gender: 'female',
      description: 'French conversational female',
    },
    {
      id: 'fr-FR-HenriNeural',
      name: 'Henri (FR Neural)',
      lang: 'fr-FR',
      gender: 'male',
      description: 'French conversational male',
    },
    {
      id: 'es-ES-ElviraNeural',
      name: 'Elvira (ES Neural)',
      lang: 'es-ES',
      gender: 'female',
      description: 'Spanish female voice',
    },
    {
      id: 'es-ES-AlvaroNeural',
      name: 'Alvaro (ES Neural)',
      lang: 'es-ES',
      gender: 'male',
      description: 'Spanish male voice',
    },
  ],
  google: [
    {
      id: 'en-US-Journey-F',
      name: 'Journey Female (US)',
      lang: 'en-US',
      gender: 'female',
      description: 'Expressive human-like female voice',
    },
    {
      id: 'en-US-Journey-D',
      name: 'Journey Male (US)',
      lang: 'en-US',
      gender: 'male',
      description: 'Expressive human-like male voice',
    },
    {
      id: 'en-US-Neural2-C',
      name: 'Neural2 Female (US)',
      lang: 'en-US',
      gender: 'female',
      description: 'Clear standard Neural2 female',
    },
    {
      id: 'en-US-Neural2-D',
      name: 'Neural2 Male (US)',
      lang: 'en-US',
      gender: 'male',
      description: 'Clear standard Neural2 male',
    },
    {
      id: 'fr-FR-Neural2-A',
      name: 'Neural2 Denise (FR)',
      lang: 'fr-FR',
      gender: 'female',
      description: 'French female voice',
    },
    {
      id: 'es-ES-Neural2-A',
      name: 'Neural2 Lucia (ES)',
      lang: 'es-ES',
      gender: 'female',
      description: 'Spanish female voice',
    },
  ],
  polly: [
    {
      id: 'Joanna',
      name: 'Joanna (US Neural)',
      lang: 'en-US',
      gender: 'female',
      description: 'Warm and natural American female',
    },
    {
      id: 'Matthew',
      name: 'Matthew (US Neural)',
      lang: 'en-US',
      gender: 'male',
      description: 'Natural conversational American male',
    },
    {
      id: 'Amy',
      name: 'Amy (UK Neural)',
      lang: 'en-GB',
      gender: 'female',
      description: 'Sophisticated British female',
    },
    {
      id: 'Arthur',
      name: 'Arthur (UK Neural)',
      lang: 'en-GB',
      gender: 'male',
      description: 'Refined British male',
    },
    {
      id: 'Lea',
      name: 'Léa (FR Neural)',
      lang: 'fr-FR',
      gender: 'female',
      description: 'Natural French female',
    },
    {
      id: 'Lucia',
      name: 'Lucia (ES Neural)',
      lang: 'es-ES',
      gender: 'female',
      description: 'Warm Spanish female',
    },
  ],
  minimax: [
    {
      id: 'female-tutor-01',
      name: 'Grace (Warm Tutor)',
      lang: 'en-US',
      gender: 'female',
      description: 'Gentle English tutor voice',
    },
    {
      id: 'male-tutor-01',
      name: 'Arthur (Deep Tutor)',
      lang: 'en-US',
      gender: 'male',
      description: 'Knowledgeable tutor voice',
    },
    {
      id: 'female-chat-02',
      name: 'Chloe (Playful)',
      lang: 'en-US',
      gender: 'female',
      description: 'Vibrant and expressive',
    },
  ],
  browser: [
    {
      id: 'default',
      name: 'Browser Default Voice',
      lang: 'en-US',
      gender: 'neutral',
      description: 'System text-to-speech engine',
    },
  ],
};
