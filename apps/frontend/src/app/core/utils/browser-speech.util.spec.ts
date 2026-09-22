import { describe, it, expect } from 'vitest';
import { splitChunks, resolveBrowserVoice } from './browser-speech.util';

function voice(name: string, lang: string, def = false): SpeechSynthesisVoice {
  return { name, lang, default: def } as SpeechSynthesisVoice;
}

describe('splitChunks', () => {
  it('keeps short texts in one chunk', () => {
    expect(splitChunks('Hello world.')).toEqual(['Hello world.']);
  });

  it('splits long multi-sentence texts under the limit', () => {
    const text =
      'First sentence is here. Second sentence follows right away. ' +
      'Third one joins. Fourth arrives. Fifth closes the paragraph. ' +
      'Sixth keeps going. Seventh ends it.';
    const chunks = splitChunks(text, 60);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(60);
    expect(chunks.join(' ')).toBe(text);
  });

  it('hard-splits a single over-long sentence on words', () => {
    const text = 'word '.repeat(60).trim();
    const chunks = splitChunks(text, 50);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(50);
  });
});

describe('resolveBrowserVoice', () => {
  const voices = [
    voice('Google US', 'en-US', true),
    voice('Google FR', 'fr-FR'),
  ];

  it('returns null without voices', () => {
    expect(resolveBrowserVoice([])).toBeNull();
  });

  it('prefers explicit voice, then name, then user selection', () => {
    expect(
      resolveBrowserVoice(voices, { voice: voices[1], lang: 'en' })?.name,
    ).toBe('Google FR');
    expect(
      resolveBrowserVoice(voices, { voiceName: 'Google FR' }, 'Google US')
        ?.name,
    ).toBe('Google FR');
    expect(resolveBrowserVoice(voices, {}, 'Google FR')?.name).toBe(
      'Google FR',
    );
  });

  it('falls back to language, default, then first', () => {
    expect(resolveBrowserVoice(voices, { lang: 'fr' })?.name).toBe('Google FR');
    expect(resolveBrowserVoice(voices, { lang: 'de' })?.name).toBe('Google US');
  });
});
