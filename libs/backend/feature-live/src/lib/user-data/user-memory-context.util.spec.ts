/**
 * Unit tests — buildPromptContext (task 105 scope rules, real util, no I/O).
 * Covers: global + model merge, foreign-model exclusion, null scope,
 *         50-entry / 4000-char caps, most-recent-first order, empty list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPromptContext,
  MAX_CONTEXT_CHARS,
  MAX_CONTEXT_MEMORIES,
  type MemoryContextEntry,
} from './user-memory-context.util.ts';

const entry = (
  id: string,
  modelScope: string | null,
  updatedAt: string,
  text = id,
): MemoryContextEntry => ({ id, text, modelScope, updatedAt });

const A = entry('a', null, '2026-01-01T00:00:00.000Z', 'likes football');
const B = entry('b', null, '2026-01-02T00:00:00.000Z', 'prefers morning');
const M = entry(
  'm',
  'gemini-2.5-pro',
  '2026-01-03T00:00:00.000Z',
  'model-only fact',
);

describe('buildPromptContext', () => {
  it('returns an empty string for an empty list', () => {
    assert.equal(buildPromptContext([], 'gemini-2.5-pro'), '');
    assert.equal(buildPromptContext([], null), '');
  });

  it('merges global and current-model memories', () => {
    const ctx = buildPromptContext([A, B, M], 'gemini-2.5-pro');
    assert.match(ctx, /likes football/);
    assert.match(ctx, /prefers morning/);
    assert.match(ctx, /model-only fact/);
  });

  it('excludes another model memory for a foreign scope', () => {
    const ctx = buildPromptContext([A, B, M], 'openai:gpt-4o');
    assert.match(ctx, /likes football/);
    assert.match(ctx, /prefers morning/);
    assert.doesNotMatch(ctx, /model-only fact/);
  });

  it('keeps globals only when no model is selected', () => {
    const ctx = buildPromptContext([A, B, M], null);
    assert.match(ctx, /likes football/);
    assert.match(ctx, /prefers morning/);
    assert.doesNotMatch(ctx, /model-only fact/);
  });

  it('formats one "- text" line per memory, most recent first', () => {
    const ctx = buildPromptContext([A, B, M], 'gemini-2.5-pro');
    assert.equal(ctx.split('\n').length, 3);
    const lines = ctx.split('\n');
    assert.equal(lines[0], '- model-only fact');
    assert.equal(lines[1], '- prefers morning');
    assert.equal(lines[2], '- likes football');
  });

  it('caps at 50 entries, keeping the most recent ones', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      entry(
        `e${i}`,
        null,
        new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
        `memory ${i}`,
      ),
    );
    const lines = buildPromptContext(many, null).split('\n');
    assert.equal(lines.length, MAX_CONTEXT_MEMORIES);
    assert.equal(lines[0], '- memory 79');
    assert.equal(lines[49], '- memory 30');
    assert.doesNotMatch(buildPromptContext(many, null), /memory 29\b/);
  });

  it('never exceeds the 4000-character budget', () => {
    const long = Array.from({ length: 20 }, (_, i) =>
      entry(
        `l${i}`,
        null,
        new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
        'x'.repeat(400),
      ),
    );
    const ctx = buildPromptContext(long, null);
    assert.ok(ctx.length <= MAX_CONTEXT_CHARS, `len=${ctx.length}`);
    assert.ok(ctx.length > 0);
  });
});
