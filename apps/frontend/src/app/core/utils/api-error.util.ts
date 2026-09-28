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
  if (code in SHARED_MESSAGES.error) {
    const shared =
      SHARED_MESSAGES.error[code as keyof typeof SHARED_MESSAGES.error];
    // Function entries (e.g. memoryQuotaReached) need arguments — they are
    // never plain codes, so fall back to the curated MESSAGES text here.
    return typeof shared === 'string' ? shared : MESSAGES.error[code];
  }
  return MESSAGES.error[code];
}

export function formatHttpError(error: HttpErrorResponse): string {
  if (error.status === 0) return MESSAGES.error.networkUnreachable;
  // Our APIs answer { code, message }: the backend text is already curated
  // (e.g. "ELEVENLABS: ... Settings > Voices") and beats any local guess.
  const body = error.error;
  const code = readServerCode(body);
  if (code === 'authRequired') return SHARED_MESSAGES.error.authRequired;
  const serverMessage = readServerMessage(body);
  if (code === 'memoryQuotaReached') {
    const quota = readQuotaFields(body) ?? parseMemoryQuota(serverMessage);
    if (quota) {
      return SHARED_MESSAGES.error.memoryQuotaReached(quota.used, quota.max);
    }
  }
  if (serverMessage) {
    const quota = parseMemoryQuota(serverMessage);
    if (quota) {
      return SHARED_MESSAGES.error.memoryQuotaReached(quota.used, quota.max);
    }
    return truncate(serverMessage);
  }
  const raw = typeof body === 'string' ? body : JSON.stringify(body ?? '');
  return formatApiError(raw || `HTTP ${error.status}`);
}

/** Reads a machine `code` from an error body; '' when absent. */
function readServerCode(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const code = (body as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

/** Reads a user-facing `message` from an error body; '' when absent. */
function readServerMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const message = (body as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message.trim() : '';
}

interface QuotaNumbers {
  used: number;
  max: number;
}

/** Numeric `used`/`max` carried by the backend quota body, when present. */
function readQuotaFields(body: unknown): QuotaNumbers | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  return typeof record['used'] === 'number' && typeof record['max'] === 'number'
    ? { used: record['used'], max: record['max'] }
    : null;
}

/**
 * Legacy quota text (`Memory is full (50/50).`) → numbers, so the message
 * shown always comes from SHARED_MESSAGES and never from raw server text.
 */
function parseMemoryQuota(text: string): QuotaNumbers | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (!lower.includes('memory is full') && !lower.includes('memory quota')) {
    return null;
  }
  const match = /(\d+)\s*\/\s*(\d+)/.exec(text);
  return match ? { used: Number(match[1]), max: Number(match[2]) } : null;
}
