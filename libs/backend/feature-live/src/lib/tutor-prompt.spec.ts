/**
 * Unit tests — buildTutorSystemPrompt
 *
 * Tests the pure function that generates the AI tutor system prompt.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTutorSystemPrompt } from './tutor-prompt.ts';

describe('buildTutorSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildTutorSystemPrompt('English');
    assert.ok(prompt.length > 0, 'Prompt should not be empty');
  });

  it('interpolates the target language', () => {
    assert.ok(buildTutorSystemPrompt('French').includes('French'));
    assert.ok(buildTutorSystemPrompt('Japanese').includes('Japanese'));
    assert.ok(buildTutorSystemPrompt('Spanish').includes('Spanish'));
  });

  it('defaults to English when no language is provided', () => {
    const prompt = buildTutorSystemPrompt();
    assert.ok(prompt.includes('English'));
  });

  it('contains GitHub-flavored Markdown formatting instructions', () => {
    const prompt = buildTutorSystemPrompt('English');
    assert.ok(prompt.includes('GitHub-flavored Markdown'), 'Must mention GFM');
    assert.ok(prompt.includes('**bold**'), 'Must include bold instruction');
    assert.ok(prompt.includes('*italics*'), 'Must include italics instruction');
    assert.ok(prompt.includes('tables'), 'Must include tables instruction');
    assert.ok(
      prompt.includes('blockquotes'),
      'Must include blockquotes instruction',
    );
  });

  it('contains all required formatting elements', () => {
    const prompt = buildTutorSystemPrompt('German');
    assert.ok(prompt.includes('bullet points'), 'Must mention bullet points');
    assert.ok(prompt.includes('code blocks'), 'Must mention code blocks');
    assert.ok(prompt.includes('headings'), 'Must mention headings');
  });
});
