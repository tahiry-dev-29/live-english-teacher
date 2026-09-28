import { HttpErrorResponse } from '@angular/common/http';
import { SHARED_MESSAGES } from '@shared/constants';
import {
  ERROR_CODES,
  MESSAGES,
  type ErrorCode,
} from '@core/constants/messages';

/** Raw text longer than this is truncated before being shown to the user. */
const MAX_RAW_ERROR_LENGTH = 200;

const NOT_FOUND_MATCHERS = ['404', 'not found'];
const AUTH_MATCHERS = [
  '401',
  '403',
  'invalid api key',
  'unauthorized',
  'api key expired',
  'expired api key',
];
const MISSING_KEY_MATCHERS = ['no api key', 'not set', 'api key is missing'];
// Quota signals only: the backend sends a structured `code: QUOTA_EXCEEDED`
// (see libs/backend/.../tts-failure.util.ts), so this text scan is a last-resort
// fallback. Keep it unambiguous — "rate limit"/"expired" alone are too generic
// (rate-limited model, expired session) and would hijack unrelated errors.
const QUOTA_MATCHERS = [
  'quota_exceeded',
  'quota exceeded',
  'quota',
  '429',
  '402',
];
const NETWORK_MATCHERS = ['could not', 'network', 'fetch'];

const containsAny = (value: string, matchers: readonly string[]): boolean =>
  matchers.some((matcher) => value.includes(matcher));

const truncate = (raw: string): string =>
  raw.length > MAX_RAW_ERROR_LENGTH
    ? `${raw.slice(0, MAX_RAW_ERROR_LENGTH - 3)}...`
    : raw;

/** Maps a raw API/stream error to a known message code, `unknown` otherwise. */
export function resolveApiErrorCode(raw: string): ErrorCode | 'unknown' {
  if (!raw) return 'aiServiceUnavailable';
  if (raw === ERROR_CODES.quotaExceeded) return 'quotaExceeded';

  const lower = raw.toLowerCase();
  if (containsAny(lower, QUOTA_MATCHERS)) return 'quotaExceeded';

  if (
    containsAny(lower, NOT_FOUND_MATCHERS) ||
    (lower.includes('model') && lower.includes('not available'))
  ) {
    return 'modelUnavailable';
  }
  if (containsAny(lower, AUTH_MATCHERS)) return 'invalidApiKey';
  if (containsAny(lower, MISSING_KEY_MATCHERS)) return 'noApiKey';
  if (containsAny(lower, NETWORK_MATCHERS)) return 'networkUnreachable';

  return 'unknown';
}

/**
 * User-facing error text. Known failures get a curated message from MESSAGES,
 * unknown ones fall back to the truncated raw text (no emoji prefix).
 */
export function formatApiError(raw: string): string {
  const code = resolveApiErrorCode(raw);
  if (code === 'unknown') return truncate(raw);
  return code in SHARED_MESSAGES.error
    ? SHARED_MESSAGES.error[code as keyof typeof SHARED_MESSAGES.error]
    : MESSAGES.error[code];
}

export function formatHttpError(error: HttpErrorResponse): string {
  if (error.status === 0) return MESSAGES.error.networkUnreachable;
  // Our APIs answer { code, message }: the backend text is already curated
  // (e.g. "ELEVENLABS: ... Settings > Voices") and beats any local guess.
  const serverMessage = readServerMessage(error.error);
  if (serverMessage) return truncate(serverMessage);
  const body =
    typeof error.error === 'string'
      ? error.error
      : JSON.stringify(error.error ?? '');
  return formatApiError(body || `HTTP ${error.status}`);
}

/** Reads a user-facing `message` from an error body; '' when absent. */
function readServerMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const message = (body as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message.trim() : '';
}
