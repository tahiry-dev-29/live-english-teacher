/**
 * TTS failure taxonomy for POST /ai/tts.
 * Dependency-free on purpose (node --test imports it directly): codes, HTTP
 * status and the upstream body -> code classification. Text mapping lives in
 * the route (shared messages) and in the frontend util.
 */

export const TTS_ERROR_CODES = {
  quotaExceeded: 'QUOTA_EXCEEDED',
  invalidApiKey: 'INVALID_API_KEY',
  missingApiKey: 'MISSING_API_KEY',
  voiceUnavailable: 'VOICE_UNAVAILABLE',
  providerUnsupported: 'UNSUPPORTED_PROVIDER',
  providerUnavailable: 'PROVIDER_UNAVAILABLE',
} as const;

export type TtsErrorCode =
  (typeof TTS_ERROR_CODES)[keyof typeof TTS_ERROR_CODES];

export interface TtsSuccess {
  ok: true;
  audioData: string;
  mimeType: string;
}

export interface TtsFailure {
  ok: false;
  code: TtsErrorCode;
  provider: string;
  status?: number;
  /** Truncated upstream body: what to read in the logs / UI to fix the key. */
  detail?: string;
}

export type TtsSynthesisOutcome = TtsSuccess | TtsFailure;

/** HTTP status per failure code (503 only for a real upstream outage). */
export const TTS_FAILURE_STATUS: Record<TtsErrorCode, number> = {
  QUOTA_EXCEEDED: 429,
  INVALID_API_KEY: 401,
  MISSING_API_KEY: 401,
  VOICE_UNAVAILABLE: 400,
  UNSUPPORTED_PROVIDER: 400,
  PROVIDER_UNAVAILABLE: 502,
};

const MAX_DETAIL_LENGTH = 200;

/** ElevenLabs answers 401 for quota: check the body before the status. */
const QUOTA_HINTS = ['quota', 'rate limit', 'credits', 'insufficient'];
const KEY_HINTS = [
  'invalid api key',
  'unauthorized',
  'authentication',
  'permission',
  'api key',
];

export function ttsFailure(
  code: TtsErrorCode,
  provider: string,
  status?: number,
  detail?: string,
): TtsFailure {
  return {
    ok: false,
    code,
    provider,
    ...(status ? { status } : {}),
    ...(detail ? { detail: detail.slice(0, MAX_DETAIL_LENGTH) } : {}),
  };
}

export function missingKeyFailure(provider: string): TtsFailure {
  return ttsFailure(TTS_ERROR_CODES.missingApiKey, provider);
}

export function unsupportedProviderFailure(provider: string): TtsFailure {
  return ttsFailure(TTS_ERROR_CODES.providerUnsupported, provider);
}

/** Upstream status + body -> failure code (and a readable detail). */
export function classifyTtsFailure(
  provider: string,
  status: number,
  body = '',
): TtsFailure {
  const text = body.toLowerCase();
  const hasHint = (hints: string[]): boolean =>
    hints.some((hint) => text.includes(hint));

  if (status === 429 || status === 402 || hasHint(QUOTA_HINTS)) {
    return ttsFailure(TTS_ERROR_CODES.quotaExceeded, provider, status, body);
  }
  if (status === 401 || status === 403 || hasHint(KEY_HINTS)) {
    return ttsFailure(TTS_ERROR_CODES.invalidApiKey, provider, status, body);
  }
  if (status === 400 || status === 404 || status === 422) {
    return ttsFailure(TTS_ERROR_CODES.voiceUnavailable, provider, status, body);
  }
  return ttsFailure(
    TTS_ERROR_CODES.providerUnavailable,
    provider,
    status,
    body,
  );
}

/**
 * Retry decision after a failed attempt: only a stale voice/model deserves one
 * retry with the registry defaults. Quota/key failures must not burn requests.
 */
export function planDefaultRetry(
  first: TtsFailure,
  requested: { voiceId: string; modelId?: string },
  defaults: { voiceId: string; modelId: string },
): { voiceId: string; modelId: string } | null {
  if (first.code !== TTS_ERROR_CODES.voiceUnavailable) return null;
  const onDefaultVoice = requested.voiceId === defaults.voiceId;
  const onDefaultModel =
    !requested.modelId || requested.modelId === defaults.modelId;
  if (onDefaultVoice && onDefaultModel) return null;
  return { voiceId: defaults.voiceId, modelId: defaults.modelId };
}
