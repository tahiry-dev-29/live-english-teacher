/**
 * Single source of truth for runtime messages: error / warning / success texts
 * and console log labels. No emoji here — UI icons come from @lucide/angular.
 */

import { SHARED_MESSAGES } from '@shared/constants';

export const MESSAGES = {
  error: {
    /** Generic fallback when the AI backend is unreachable. */
    aiServiceUnavailable: SHARED_MESSAGES.error.aiServiceUnavailable,
    /** Default text when the stream reports an error without a message. */
    aiServiceError: SHARED_MESSAGES.error.aiServiceError,
    audioProcessingFailed:
      'Could not process audio. Please try again or send a text message.',
    quotaExceeded: SHARED_MESSAGES.error.quotaExceeded,
    modelUnavailable: SHARED_MESSAGES.error.modelUnavailable,
    invalidApiKey: SHARED_MESSAGES.error.invalidApiKey,
    noApiKey: SHARED_MESSAGES.error.noApiKey,
    networkUnreachable: SHARED_MESSAGES.error.networkUnreachable,
    noActiveRecording: 'No active recording',
    microphoneAccessDenied:
      'Could not access microphone. Please check your browser permissions.',
  },
  warning: {
    quotaBannerBody: SHARED_MESSAGES.templates.quotaBannerBody,
    quotaBannerAction: SHARED_MESSAGES.templates.quotaBannerAction,
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
    ttsRequestFailed: 'Server TTS request failed:',
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
    SHARED_MESSAGES.templates.quotaBannerTitle(provider),
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
