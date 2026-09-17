/** Centralized backend messages: user-facing errors and logger labels. No emoji. */
export const BACKEND_MESSAGES = {
  error: {
    geminiApiKeyMissing:
      'No API key configured. Please add your Gemini API key in Settings > AI Model to continue chatting.',
    groqApiKeyMissing:
      'No API key configured. Please add your Groq API key in Settings > AI Model to continue chatting.',
    aiUnreachable:
      'Could not reach AI service. Please check your internet connection or try a different model in Settings.',
    geminiConnectivity:
      "I'm experiencing connectivity issues. Please try again later or verify your Gemini API key in Settings.",
    geminiEmptyResponse:
      "I'm sorry, I couldn't generate a response right now. Could you try asking something else?",
    geminiRetriesExhausted:
      'Failed to get response from Gemini after multiple retries.',
    noResponseReceived: 'No response received from model.',
    transcriptionFailed: 'Transcription failed or service unavailable',
    unknown: 'Unknown error',
  },
  log: {
    geminiKeyMissing: 'GEMINI_API_KEY is not set.',
    groqKeyMissing: 'GROQ_API_KEY is not set.',
    groqTranscribeKeyMissing:
      'GROQ_API_KEY is not configured for transcription.',
    elevenLabsKeyMissing: 'ELEVENLABS_API_KEY is not configured.',
    geminiChatReceived: 'Gemini chat response received.',
    geminiEmptyContent: 'Gemini response was okay but content was empty.',
    geminiTtsGenerated: 'TTS audio generated successfully.',
    geminiTtsNoAudio: 'No audio data in TTS response.',
  },
  template: {
    requestingChat: (url: string): string => `Requesting Chat from: ${url}`,
    generatingTts: (voice: string): string =>
      `Generating TTS audio with voice: ${voice}`,
    retryingIn: (seconds: number): string => `Retrying in ${seconds}s...`,
    attemptFailed: (
      attempt: number,
      status: number,
      statusText: string,
    ): string => `API Error (Attempt ${attempt}): ${status} - ${statusText}`,
    ttsApiError: (status: number, statusText: string): string =>
      `TTS API Error: ${status} - ${statusText}`,
    elevenLabsApiError: (
      status: number,
      statusText: string,
      body: string,
    ): string => `ElevenLabs API Error: ${status} - ${statusText}: ${body}`,
    elevenLabsTtsFailed: (reason: string): string =>
      `Failed to generate ElevenLabs TTS: ${reason}`,
    geminiChatError: (reason: string): string =>
      `Error in getGeminiChatResponse: ${reason}`,
    geminiTtsError: (reason: string): string =>
      `Error in getGeminiTtsAudio: ${reason}`,
    groqChatError: (reason: string): string =>
      `Error in getGroqChatResponse: ${reason}`,
    groqApiError: (
      model: string,
      status: number,
      statusText: string,
      body: string,
    ): string =>
      `Groq API error with ${model}: ${status} - ${statusText} - ${body}`,
    groqWhisperError: (
      status: number,
      statusText: string,
      body: string,
    ): string => `Groq Whisper Error: ${status} - ${statusText}: ${body}`,
    groqTranscribeFailed: (reason: string): string =>
      `Failed to transcribe audio with Groq: ${reason}`,
    providerHttpError: (
      label: string,
      status: number,
      statusText: string,
      body: string,
    ): string => `${label} error: ${status} - ${statusText} - ${body}`,
    providerModelError: (label: string, status: number): string =>
      `${label} error (${status}). Please verify your model or API key.`,
    providerError: (label: string, reason: string): string =>
      `Error in ${label}: ${reason}`,
    providerStreamError: (label: string, reason: string): string =>
      `Stream error in ${label}: ${reason}`,
    providerUnreachable: (label: string): string =>
      `Could not reach ${label} service.`,
    quotaExceeded: (provider: string): string =>
      `Quota exceeded for ${provider}, prompting user for own key.`,
    sseStreamError: (reason: string): string => `SSE stream error: ${reason}`,
    ttsUnavailable: (provider: string): string =>
      `TTS not available for provider "${provider}"`,
    appRunning: (url: string): string => `Application is running on: ${url}`,
    genkitRunning: (url: string): string =>
      `GenKit Flow Server is running on: ${url}`,
  },
} as const;
