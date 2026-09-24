/**
 * Unit tests — Gemini SSE URL shape + delta parsing + frame reassembly.
 * Shared inline re-implementation lives in gemini-stream.spec-fixtures.ts.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveGeminiStreamUrl,
  parseGeminiSseLine,
  streamResponseDeltas,
  chunk,
  sseResponse,
} from './gemini-stream.spec-fixtures.ts';

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
