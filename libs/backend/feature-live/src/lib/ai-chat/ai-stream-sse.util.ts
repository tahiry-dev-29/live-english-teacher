/** Minimal SSE writer used by the AI stream route (testable without Express). */
export interface SseWriter {
  write(chunk: string): void;
  end(chunk: string): void;
}

export function sseData(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function writeToken(res: SseWriter, token: string): void {
  res.write(sseData({ token }));
}

export function writeSession(res: SseWriter, sessionId: string): void {
  res.write(sseData({ sessionId }));
}

export function writeTitle(res: SseWriter, title: string): void {
  res.write(sseData({ title }));
}

export function writeQuotaError(res: SseWriter, provider: string): void {
  res.write(sseData({ error: true, errorCode: 'QUOTA_EXCEEDED', provider }));
}

export function writeStreamError(res: SseWriter, message: string): void {
  res.write(sseData({ error: true, message }));
}

export function endStream(res: SseWriter): void {
  res.end('data: [DONE]\n\n');
}
