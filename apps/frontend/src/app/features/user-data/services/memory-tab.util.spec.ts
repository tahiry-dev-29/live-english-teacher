import { describe, it, expect } from 'vitest';
import {
  canAddMemory,
  counterLabel,
  isEditing,
  normalizeScope,
  scopeLabel,
} from './memory-tab.util';

describe('memory-tab.util', () => {
  it('rejects empty drafts', () => {
    expect(canAddMemory('', '')).toBe(false);
    expect(canAddMemory('   ', 'global')).toBe(false);
  });

  it('accepts text on a visible tab', () => {
    expect(canAddMemory('x', 'global')).toBe(true);
    expect(canAddMemory('x', 'model')).toBe(true);
  });

  it('labels scopes for humans', () => {
    expect(scopeLabel('gemini-2.5-pro')).toBe('Gemini 2.5 Pro');
    expect(scopeLabel('gemini:gemini-2.5-pro')).toBe('Gemini 2.5 Pro');
    expect(scopeLabel(null)).toBe('All models');
  });

  it('falls back to globals when no model is selected', () => {
    expect(normalizeScope('global', 'groq:gpt-4o')).toBe('global');
    expect(normalizeScope('model', 'groq:gpt-4o')).toBe('model');
    expect(normalizeScope('model', null)).toBe('global');
  });

  it('tracks the edited row', () => {
    expect(isEditing(null, '1')).toBe(false);
    expect(isEditing('2', '1')).toBe(false);
    expect(isEditing('1', '1')).toBe(true);
  });

  it('formats the quota counter', () => {
    expect(counterLabel(3, 50)).toBe('3/50');
    expect(counterLabel(0, 50)).toBe('0/50');
  });
});
