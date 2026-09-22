/** Shared types for the voice-call slice (T93 split, no Angular deps). */

export enum CallState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking',
}

export interface VoiceCallCallbacks {
  onTranscriptReady?: (text: string) => void;
  onInactivity?: () => void;
  onStateChange?: (state: CallState) => void;
  language?: string;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  0: { transcript: string };
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number } & Record<number, SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Short UI language code → BCP-47 tag for SpeechRecognition. */
export const LANGUAGE_TAG_BY_CODE: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  ja: 'ja-JP',
};

export function resolveSpeechLang(input: string | undefined): string {
  if (!input) return 'en-US';
  return LANGUAGE_TAG_BY_CODE[input] || input;
}
