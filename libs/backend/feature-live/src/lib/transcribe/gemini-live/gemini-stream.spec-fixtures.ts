/**
 * Shared inline re-implementation for the Gemini SSE streaming specs
 * (repo pattern: node:test cannot resolve the extensionless src imports).
 * Covers helpers used by gemini-stream.spec.ts (parsing) and
 * gemini-stream-contract.spec.ts (generateStream contract).
 * NOTE: Mirrors GEMINI_CONFIG from @shared/constants/external-apis — kept
 * inline because node:test cannot resolve the @shared/constants path alias.
 */

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_CHAT_MODEL = 'gemini-2.5-flash';

function buildStreamUrl(
  model: string,
  apiKey: string,
  customBase?: string,
): string {
  const base = customBase || GEMINI_API_BASE;
  return `${base}${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
}

interface GeminiChunk {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export function resolveGeminiStreamUrl(
  baseUrl: string | undefined,
  model: string,
  apiKey: string,
): string {
  return buildStreamUrl(model, apiKey, baseUrl);
}

function extractText(result: GeminiChunk): string | undefined {
  return result.candidates?.[0]?.content?.parts?.[0]?.text;
}

export function parseGeminiSseLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return '';
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return '';
  try {
    return extractText(JSON.parse(payload) as GeminiChunk) ?? '';
  } catch {
    return '';
  }
}

export async function* streamResponseDeltas(
  response: Response,
): AsyncGenerator<string, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const token = parseGeminiSseLine(line);
      if (token) yield token;
    }
  }
  const tail = parseGeminiSseLine(buffer);
  if (tail) yield tail;
}

class QuotaExceededError extends Error {}

export async function* generateStream(
  fetchImpl: typeof fetch,
  serverKey: string | undefined,
  userKey?: string,
): AsyncGenerator<string, void, unknown> {
  const key = userKey || serverKey || '';
  if (!key) {
    yield 'Gemini API key is missing.';
    return;
  }
  const response = await fetchImpl(
    resolveGeminiStreamUrl(undefined, GEMINI_CHAT_MODEL, key),
    { method: 'POST' },
  );
  if (!response.ok || !response.body) {
    if ((response.status === 429 || response.status === 402) && !userKey) {
      throw new QuotaExceededError('gemini');
    }
    yield 'Connectivity issue.';
    return;
  }
  yield* streamResponseDeltas(response);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export const chunk = (text: string): string =>
  `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] })}\n\n`;

export function sseResponse(body: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const bytes = new TextEncoder().encode(body);
      const mid = Math.floor(bytes.length / 2);
      controller.enqueue(bytes.slice(0, mid));
      controller.enqueue(bytes.slice(mid));
      controller.close();
    },
  });
  return { ok: true, status: 200, body: stream } as Response;
}
