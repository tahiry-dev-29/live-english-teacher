/**
 * Axios doubles for TTS specs: routes the default axios instance through an
 * in-memory adapter, so the real helpers run without network access.
 */
import axios from 'axios';

export interface StubCall {
  url: string;
  method: string;
  data?: unknown;
  headers: Record<string, unknown>;
}

export interface StubReply {
  status: number;
  data: unknown;
}

function plainHeaders(raw: unknown): Record<string, unknown> {
  const headers = raw as { toJSON?: () => Record<string, unknown> } | undefined;
  if (!headers) return {};
  if (typeof headers.toJSON === 'function') return headers.toJSON();
  return { ...(headers as Record<string, unknown>) };
}

/** Route axios through the handler; `restore()` puts the real adapter back. */
export function stubAxios(handler: (call: StubCall) => StubReply): {
  calls: StubCall[];
  restore: () => void;
} {
  const previous = axios.defaults.adapter;
  const calls: StubCall[] = [];
  axios.defaults.adapter = (async (config: {
    url?: string;
    method?: string;
    data?: unknown;
    headers?: unknown;
  }): Promise<unknown> => {
    const call: StubCall = {
      url: config.url || '',
      method: (config.method || 'get').toUpperCase(),
      data: config.data,
      headers: plainHeaders(config.headers),
    };
    calls.push(call);
    const reply = handler(call);
    return {
      data: reply.data,
      status: reply.status,
      statusText: String(reply.status),
      headers: {},
      config: config as never,
    };
  }) as typeof axios.defaults.adapter;
  return {
    calls,
    restore: () => {
      axios.defaults.adapter = previous;
    },
  };
}

/** 200 with raw audio bytes (mp3 vendors). */
export function audioReply(text = 'audio-bytes'): StubReply {
  return { status: 200, data: new TextEncoder().encode(text).buffer };
}

/** 200/4xx with a JSON envelope (google / minimax / error bodies). */
export function jsonReply(data: unknown, status = 200): StubReply {
  return { status, data };
}

/** Upstream failure: status + body (what the classifier reads). */
export function errorReply(status: number, body: unknown): StubReply {
  return { status, data: body };
}

/** ElevenLabs quota body (it answers HTTP 401 for an exhausted quota). */
export const ELEVEN_QUOTA_BODY = JSON.stringify({
  detail: {
    type: 'invalid_request',
    code: 'quota_exceeded',
    message:
      'This request exceeds your quota of 10000. You have 1 credits remaining, while 5 credits are required for this request.',
  },
});
