/**
 * POST /ai/tts failure payload -> user-facing text.
 * The backend answers `{ statusCode, code, provider, message, detail }`: the
 * server message wins, the shared catalogue covers partial payloads, and the
 * interceptor text is the last fallback (it already ran through formatHttpError).
 * Pure helpers (no Angular deps) so vitest can import them directly.
 */
import { SHARED_MESSAGES, SHARED_TTS_ERROR_MESSAGES } from '@shared/constants';

export interface TtsFailure {
  ok: false;
  code?: string;
  provider?: string;
  /** Ready-to-display text (never empty). */
  message: string;
}

const DEFAULT_PROVIDER = 'tts';

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Curated text for a failure code, prefixed with the provider. */
export function ttsFailureText(
  code: string | undefined,
  provider = DEFAULT_PROVIDER,
): string {
  const text = code ? SHARED_TTS_ERROR_MESSAGES[code] : undefined;
  if (!text) return SHARED_MESSAGES.error.aiServiceUnavailable;
  return `${provider.toUpperCase()}: ${text}`;
}

/** Normalizes an error response body (or a network failure) into a failure. */
export function toTtsFailure(
  raw: unknown,
  fallbackProvider = '',
  fallbackMessage = '',
): TtsFailure {
  const payload = (raw ?? {}) as Record<string, unknown>;
  const provider =
    asText(payload['provider']) || fallbackProvider || DEFAULT_PROVIDER;
  const code = asText(payload['code']);
  const message =
    asText(payload['message']) ??
    asText(fallbackMessage) ??
    ttsFailureText(code, provider);
  return { ok: false, code, provider, message };
}
