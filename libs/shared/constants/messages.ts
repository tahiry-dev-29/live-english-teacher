/** User-facing messages shared by the Angular frontend and NestJS backend. */
export const SHARED_MESSAGES = {
  error: {
    aiServiceUnavailable:
      'The AI service is currently unavailable. Please try again shortly. If the issue persists, check your API key in Settings > AI Model.',
    aiServiceError:
      'The AI service could not complete your request. Please try again.',
    quotaExceeded:
      'The server quota has been exhausted. Add your own API key in Settings > AI Model to continue.',
    modelUnavailable:
      'The selected model is unavailable. Open Settings > AI Model to choose another model or add your own API key.',
    invalidApiKey:
      'The API key is invalid or expired. Open Settings > AI Model to add or renew it.',
    noApiKey: 'No API key is configured. Open Settings > AI Model to add one.',
    networkUnreachable:
      'The AI service could not be reached. Check your internet connection and try again.',
    authRequired:
      'You must be signed in to add, edit or delete memories. Reading them stays available.',
    memoryQuotaReached: (used: number, max: number): string =>
      `Memory is full (${used}/${max}). Delete a memory to add a new one.`,
  },
  templates: {
    quotaBannerTitle: (provider: string): string =>
      `Server quota exhausted (${provider.toUpperCase()}).`,
    quotaBannerBody: 'Add your own free API key to keep chatting.',
    quotaBannerAction: 'Add my key',
    quotaSseMessage: (provider: string): string =>
      `The ${provider.toUpperCase()} quota has been exhausted. Add your own API key in Settings > AI Model to continue.`,
    memoryScopeLabel: (modelScope: string | null): string =>
      humanizeModelScope(modelScope),
  },
} as const;

/**
 * `'gemini:gemini-2.5-pro'` (or a bare `'gemini-2.5-pro'`) → `'Gemini 2.5 Pro'`,
 * `null` → `'All models'`. Pure: the single implementation both the backend
 * and the frontend memory tab use.
 */
function humanizeModelScope(modelScope: string | null): string {
  if (!modelScope) return 'All models';
  const id = modelScope.includes(':')
    ? modelScope.split(':').slice(1).join(':')
    : modelScope;
  const label = id
    .split('-')
    .map((token) =>
      /^[a-z]/i.test(token)
        ? token.charAt(0).toUpperCase() + token.slice(1)
        : token,
    )
    .join(' ');
  return label || 'All models';
}

export type SharedErrorCode = keyof typeof SHARED_MESSAGES.error;

/**
 * User-facing text per TTS failure code (POST /ai/tts contract).
 * The backend prefixes it with the provider; the frontend uses it as fallback
 * when the API response carries no message.
 */
export const SHARED_TTS_ERROR_MESSAGES: Record<string, string> = {
  QUOTA_EXCEEDED:
    'The voice quota for this provider is exhausted. Add your own API key in Settings > Voices to keep the audio.',
  INVALID_API_KEY:
    'The voice API key is invalid, expired or missing the voices/models permissions. Check it in Settings > Voices.',
  MISSING_API_KEY:
    'No voice API key is configured. Add one in Settings > Voices to enable audio playback.',
  VOICE_UNAVAILABLE:
    'The selected voice or model is unavailable for this provider. Pick another one in Settings > Voices.',
  UNSUPPORTED_PROVIDER:
    'This voice provider is not supported. Pick another one in Settings > Voices.',
  PROVIDER_UNAVAILABLE:
    'The voice service is temporarily unavailable. Try again or switch provider in Settings > Voices.',
};
