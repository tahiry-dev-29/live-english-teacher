import { describe, it, expect } from 'vitest';
import {
  mergeMemories,
  readMutationResult,
  type UserMemory,
} from './memory-merge.util';

const row = (
  id: string,
  text: string,
  modelScope: string | null = null,
): UserMemory => ({
  id,
  text,
  modelScope,
  createdAt: '',
  updatedAt: '',
});

const intent = (modelScope: string | null) => ({ modelScope });

describe('mergeMemories', () => {
  it('returns the server list untouched when nothing is pending', () => {
    const server = [row('1', 'a'), row('2', 'b')];
    expect(mergeMemories(server, null, null, null, null, false, false)).toEqual(
      server,
    );
  });

  it('prepends a created row once (dedup by id)', () => {
    const created = row('9', 'fresh');
    const once = mergeMemories(
      [created],
      null,
      { intent: intent(null), value: created },
      null,
      null,
      false,
      false,
    );
    expect(once.map((m) => m.id)).toEqual(['9']);
    const merged = mergeMemories(
      [row('1', 'a')],
      null,
      { intent: intent(null), value: created },
      null,
      null,
      false,
      false,
    );
    expect(merged.map((m) => m.id)).toEqual(['9', '1']);
  });

  it('ignores outcomes from another scope', () => {
    const created = row('9', 'foreign', 'openai:gpt-4o');
    const merged = mergeMemories(
      [row('1', 'a')],
      'groq:gpt-4o',
      { intent: intent('openai:gpt-4o'), value: created },
      null,
      null,
      false,
      false,
    );
    expect(merged.map((m) => m.id)).toEqual(['1']);
  });

  it('swaps an updated row in place', () => {
    const merged = mergeMemories(
      [row('1', 'old')],
      null,
      null,
      { intent: { id: '1', modelScope: null }, value: row('1', 'new') },
      null,
      false,
      false,
    );
    expect(merged[0].text).toBe('new');
  });

  it('hides an optimistically removed row, restores it on failure', () => {
    const server = [row('1', 'a'), row('2', 'b')];
    const hidden = mergeMemories(
      server,
      null,
      null,
      null,
      { id: '1', modelScope: null },
      false,
      false,
    );
    expect(hidden.map((m) => m.id)).toEqual(['2']);
    const restored = mergeMemories(
      server,
      null,
      null,
      null,
      { id: '1', modelScope: null },
      true,
      false,
    );
    expect(restored.map((m) => m.id)).toEqual(['1', '2']);
  });

  it('empties the list while a clear is pending without error', () => {
    const server = [row('1', 'a')];
    expect(mergeMemories(server, null, null, null, null, false, true)).toEqual(
      [],
    );
    // A failed clear lifts the mask (the service computes clearHidden false
    // as soon as clearResult.error() is set) → server truth is restored.
    expect(
      mergeMemories(server, null, null, null, null, false, false).length,
    ).toBe(1);
  });
});

describe('readMutationResult', () => {
  it('returns null without intent or on error status', () => {
    expect(
      readMutationResult(
        { status: () => 'resolved', value: () => row('1', 'a') },
        null,
      ),
    ).toBeNull();
    expect(
      readMutationResult(
        {
          status: () => 'error',
          value: () => {
            throw new Error('unreadable');
          },
        },
        intent(null),
      ),
    ).toBeNull();
  });

  it('pairs intent with value when resolved', () => {
    const value = row('1', 'a');
    expect(
      readMutationResult(
        { status: () => 'resolved', value: () => value },
        intent(null),
      ),
    ).toEqual({ intent: intent(null), value });
  });
});
