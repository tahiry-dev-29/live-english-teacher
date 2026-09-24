import type { Logger } from '@nestjs/common';

/** POST/GET → audio Buffer, or null on any failure (callers log). */
export async function fetchAudio(
  url: string,
  init: RequestInit,
  logger?: Pick<Logger, 'error' | 'warn'>,
  label = 'TTS',
): Promise<Buffer | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      logger?.error(`${label} error: ${res.status} - ${await res.text()}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    logger?.error(`${label} request failed: ${e}`);
    return null;
  }
}

export function toAudioResult(
  audio: Buffer | ArrayBuffer,
  mimeType = 'audio/mpeg',
): { audioData: string; mimeType: string } {
  const buf = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
  return { audioData: buf.toString('base64'), mimeType };
}
