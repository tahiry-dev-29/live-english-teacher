/**
 * Unit tests — combineMessageWithContext
 *
 * Locks the ChatGPT-style contract: raw text is stored/displayed,
 * the invisible context reaches the LLM call only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { combineMessageWithContext } from './chat-context.util.ts';

describe('combineMessageWithContext', () => {
  it('returns the raw message untouched when context is empty', () => {
    assert.equal(combineMessageWithContext('Hello', ''), 'Hello');
    assert.equal(combineMessageWithContext('Hello'), 'Hello');
    assert.equal(combineMessageWithContext('Hello', '   '), 'Hello');
  });

  it('appends the context block for the LLM call', () => {
    const out = combineMessageWithContext('#correction teste', 'ctx-block');
    assert.ok(out.startsWith('#correction teste'));
    assert.ok(out.includes('ctx-block'));
    assert.ok(out.includes('[user context'));
  });

  it('keeps user text first so providers treat it as the message', () => {
    const out = combineMessageWithContext('raw', 'profile-memory-tags');
    assert.ok(
      out.indexOf('raw') < out.indexOf('profile-memory-tags'),
      'Context must never precede the user message',
    );
  });
});
