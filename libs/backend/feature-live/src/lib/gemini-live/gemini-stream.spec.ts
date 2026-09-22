/**
 * Unit tests — Gemini true SSE streaming (real chat streaming fix).
 * Inline re-implementation without NestJS decorators (repo pattern:
 * node:test cannot resolve the extensionless src imports).
 * Covers: stream URL shape, SSE delta parsing (skips, malformed,
 *         frame-split), progressive yields, quota throw, user-key no-throw.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Inline re-implementation (mirrors gemini-live.util + service) ───────────
// NOTE: Mirrors GEMINI_CONFIG from @shared/constants/external-apis — kept
// inline because node:test cannot resolve the @shared/constants path alias.

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

function resolveGeminiStreamUrl(
  baseUrl: string | undefined,
  model: string,
  apiKey: string,
): string {
  return buildStreamUrl(model, apiKey, baseUrl);
}

function extractText(result: GeminiChunk): string | undefined {
  return result.candidates?.[0]?.content?.parts?.[0]?.text;
}

function parseGeminiSseLine(line: string): string {
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

async function* streamResponseDeltas(
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

async function* generateStream(
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

const chunk = (text: string): string =>
  `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] })}\n\n`;

function sseResponse(body: string): Response {
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

// ── Tests ───────────────────────────────────────────────────────────────────

describe('resolveGeminiStreamUrl', () => {
  it('targets streamGenerateContent with alt=sse', () => {
    const url = resolveGeminiStreamUrl(undefined, 'gemini-2.5-flash', 'k');
    assert.ok(url.includes(':streamGenerateContent?alt=sse&key=k'));
  });
});

describe('parseGeminiSseLine', () => {
  it('extracts text deltas', () => {
    assert.equal(parseGeminiSseLine(chunk('Hello').trim()), 'Hello');
  });

  it('skips blanks, keep-alives, [DONE] and malformed JSON', () => {
    assert.equal(parseGeminiSseLine(''), '');
    assert.equal(parseGeminiSseLine(': keep-alive'), '');
    assert.equal(parseGeminiSseLine('data: [DONE]'), '');
    assert.equal(parseGeminiSseLine('data: {broken'), '');
  });
});

describe('streamResponseDeltas', () => {
  it('reassembles frame-split chunks in order', async () => {
    const deltas: string[] = [];
    for await (const t of streamResponseDeltas(
      sseResponse(`${chunk('Hel')}${chunk('lo')}`),
    )) {
      deltas.push(t);
    }
    assert.deepEqual(deltas, ['Hel', 'lo']);
  });
});

describe('generateStream contract', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    (globalThis as Record<string, unknown>).fetch = async () =>
      sseResponse(`${chunk('Hi ') + chunk('there')}`);
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('yields tokens progressively, not one blob', async () => {
    const tokens: string[] = [];
    for await (const t of generateStream(globalThis.fetch, 'server-key')) {
      tokens.push(t);
    }
    assert.deepEqual(tokens, ['Hi ', 'there']);
  });

  it('throws quota on 429 with the server key', async () => {
    (globalThis as Record<string, unknown>).fetch = async () =>
      ({ ok: false, status: 429, body: null }) as Response;
    await assert.rejects(
      (async () => {
        for await (const _ of generateStream(globalThis.fetch, 'server-key')) {
          // drain — must throw before any yield
        }
      })(),
      /gemini/i,
    );
  });

  it('yields a connectivity message on 429 with a user key (no throw)', async () => {
    (globalThis as Record<string, unknown>).fetch = async () =>
      ({ ok: false, status: 429, body: null }) as Response;
    const tokens: string[] = [];
    for await (const t of generateStream(
      globalThis.fetch,
      'server-key',
      'user-key',
    )) {
      tokens.push(t);
    }
    assert.equal(tokens.length, 1);
  });

  it('yields a message without a key instead of calling the API', async () => {
    let called = false;
    (globalThis as Record<string, unknown>).fetch = async () => {
      called = true;
      return sseResponse('');
    };
    const tokens: string[] = [];
    for await (const t of generateStream(globalThis.fetch, undefined)) {
      tokens.push(t);
    }
    assert.equal(called, false);
    assert.equal(tokens.length, 1);
  });
});
