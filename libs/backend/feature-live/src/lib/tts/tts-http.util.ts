import axios, { type AxiosRequestConfig } from 'axios';
import type { Logger } from '@nestjs/common';
import type { TtsSuccess } from './tts-failure.util';

/**
 * Outbound HTTP for TTS. All external API calls use axios (stack rule), with a
 * hard timeout and `validateStatus: () => true`: upstream statuses are part of
 * the failure contract (401 quota, 429, 400 voice/model), never an exception.
 */
export const TTS_REQUEST_TIMEOUT_MS = 15_000;

export type HttpOutcome<T> =
  { ok: true; data: T } | { ok: false; status: number; body: string };

type HttpLogger = Pick<Logger, 'error' | 'warn'>;

function toDetail(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  // axios answers a Buffer for responseType 'arraybuffer' — even on errors —
  // so JSON.stringify would produce {"type":"Buffer","data":[123,...]} garbage.
  if (Buffer.isBuffer(payload)) return payload.toString('utf8');
  if (payload instanceof Uint8Array) {
    return Buffer.from(payload).toString('utf8');
  }
  if (payload instanceof ArrayBuffer) {
    return Buffer.from(payload).toString('utf8');
  }
  try {
    return JSON.stringify(payload ?? '');
  } catch {
    return '';
  }
}

async function send<T>(
  config: AxiosRequestConfig,
  logger: HttpLogger | undefined,
  label: string,
): Promise<HttpOutcome<T>> {
  try {
    const res = await axios.request<T>({
      timeout: TTS_REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
      ...config,
    });
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, data: res.data };
    }
    const body = toDetail(res.data);
    logger?.error(`${label} error: ${res.status} - ${body}`);
    return { ok: false, status: res.status, body };
  } catch (e) {
    const body = e instanceof Error ? e.message : String(e);
    logger?.error(`${label} request failed: ${body}`);
    return { ok: false, status: 0, body };
  }
}

/** POST returning raw audio bytes (elevenlabs / openai / azure). */
export async function postForAudio(
  url: string,
  data: unknown,
  headers: Record<string, string>,
  logger?: HttpLogger,
  label = 'TTS',
): Promise<HttpOutcome<Buffer>> {
  const out = await send<ArrayBuffer | Buffer>(
    { method: 'POST', url, data, headers, responseType: 'arraybuffer' },
    logger,
    label,
  );
  if (out.ok === false) return out;
  return {
    ok: true,
    data: Buffer.isBuffer(out.data) ? out.data : Buffer.from(out.data),
  };
}

/** POST returning a JSON envelope (google / minimax). */
export function postForJson(
  url: string,
  data: unknown,
  headers: Record<string, string>,
  logger?: HttpLogger,
  label = 'TTS',
): Promise<HttpOutcome<unknown>> {
  return send({ method: 'POST', url, data, headers }, logger, label);
}

/** GET returning a JSON envelope (voice/model catalogs). */
export function getJson(
  url: string,
  headers: Record<string, string>,
  logger?: HttpLogger,
  label = 'TTS',
): Promise<HttpOutcome<unknown>> {
  return send({ method: 'GET', url, headers }, logger, label);
}

export function audioSuccess(
  audio: Buffer | ArrayBuffer,
  mimeType = 'audio/mpeg',
): TtsSuccess {
  const buf = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
  return { ok: true, audioData: buf.toString('base64'), mimeType };
}
