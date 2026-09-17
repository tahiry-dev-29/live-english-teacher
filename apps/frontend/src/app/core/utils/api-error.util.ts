import {
  ERROR_CODES,
  MESSAGES,
  type ErrorCode,
} from '@core/constants/messages';

/** Raw text longer than this is truncated before being shown to the user. */
const MAX_RAW_ERROR_LENGTH = 200;

const NOT_FOUND_MATCHERS = ['404', 'not found'];
const AUTH_MATCHERS = ['401', '403', 'invalid api key', 'unauthorized'];
const MISSING_KEY_MATCHERS = ['no api key', 'not set'];
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
  return code === 'unknown' ? truncate(raw) : MESSAGES.error[code];
}
