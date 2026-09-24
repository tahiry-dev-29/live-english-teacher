/**
 * Unit tests — generateStream contract: progressive yields, quota throw,
 * user-key no-throw, missing key short-circuit.
 * Shared inline re-implementation lives in gemini-stream.spec-fixtures.ts.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateStream,
  chunk,
  sseResponse,
} from './gemini-stream.spec-fixtures.ts';

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
