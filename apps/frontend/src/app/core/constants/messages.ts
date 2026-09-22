/**
 * Single source of truth for runtime messages: error / warning / success texts
 * and console log labels. No emoji here — UI icons come from @lucide/angular.
 */

export const MESSAGES = {
  error: {
    /** Generic fallback when the AI backend is unreachable. */
    aiServiceUnavailable: 'AI service unavailable. Please try again.',
    /** Default text when the stream reports an error without a message. */
    aiServiceError: 'AI service error',
    audioProcessingFailed:
      'Could not process audio. Please try again or send a text message.',
    quotaExceeded:
      'Server quota exhausted. Add your own API key in Settings > AI Model to keep chatting.',
    modelUnavailable:
      'Model not available. Open Settings > AI Model to select a working model, or add your own API key.',
    invalidApiKey:
      'Invalid API key. Open Settings > AI Model to add or check your API key.',
    noApiKey:
      'No API key configured. Open Settings > AI Model to add your API key.',
    networkUnreachable:
      'Could not reach AI service. Check your internet connection and try again.',
    noActiveRecording: 'No active recording',
    microphoneAccessDenied:
      'Could not access microphone. Please check your browser permissions.',
  },
  warning: {
    quotaBannerBody: 'Add your own free API key to keep chatting.',
    quotaBannerAction: 'Add my key',
    inactivityPrompt: "I can't hear you. Are you still there?",
  },
  success: {
    messageCopied: 'Message copied to clipboard',
  },
  log: {
    messagesResourceFailed: 'Error in messagesResource loader:',
    streamFailed: 'Message streaming failed:',
    sendAudioFailed: 'Error sending audio message:',
    transcriptionFailed: 'Transcription request failed:',
    modelsFetchFailed: 'Failed to fetch dynamic AI models, using defaults:',
    voicePreviewFailed: 'Voice preview error:',
    audioPlaybackFailed: 'Audio playback error:',
    audioBlobFailed: 'Error creating audio blob:',
    audioPlayFailed: 'Failed to play audio:',
    ttsSpeakFailed: 'TTS speak() failed:',
    ttsRequestFailed: 'ElevenLabs TTS request failed:',
    ttsFallback: 'TTS service unavailable, falling back to Web Speech:',
    ttsUnavailable: (provider: string): string =>
      `TTS not available for provider "${provider}". Using fallback.`,
    audioFallback: 'Audio playback error, fallback to Web Speech',
    audioFallbackFailed: 'Audio play error, fallback to Web Speech:',
    vadStartFailed: 'Error starting VAD:',
    vadStarted: 'VAD started successfully',
    vadStopped: 'VAD stopped',
    speechStarted: 'Speech started',
    speechEnded: 'Speech ended',
    voiceCallStartFailed: 'Error starting voice call:',
    voiceCallUiStartFailed: 'Failed to start voice call:',
    mediaRecorderSetupFailed: 'Could not setup MediaRecorder for Whisper:',
    mediaRecorderFailed: 'MediaRecorder error:',
    recordingStartFailed: 'Failed to start recording',
    recordingStopFailed: 'Failed to stop recording',
  },
} as const;

/** Messages needing interpolation (kept out of MESSAGES to stay plain strings). */
export const MESSAGE_TEMPLATES = {
  quotaBannerTitle: (provider: string): string =>
    `Server quota exhausted (${provider.toUpperCase()}).`,
  streamRequestFailed: (status: number): string =>
    `SSE request failed with status ${status}`,
} as const;

/** Error codes exchanged with the backend (SSE events). */
export const ERROR_CODES = {
  quotaExceeded: 'QUOTA_EXCEEDED',
} as const;

export type ErrorCode = keyof typeof MESSAGES.error;
export type WarningCode = keyof typeof MESSAGES.warning;
export type SuccessCode = keyof typeof MESSAGES.success;
export type LogCode = keyof typeof MESSAGES.log;
