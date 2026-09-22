import { describe, it, expect } from 'vitest';
import {
  sampleTextFor,
  toTtsProviderOptions,
  toVoiceOptions,
  toTtsModelOptions,
} from './settings-tab-voices.util';

describe('settings-tab-voices.util (live-only guard)', () => {
  it('returns sample text per lang with en fallback', () => {
    expect(sampleTextFor('fr')).toContain('Bonjour');
    expect(sampleTextFor('xx-unknown')).toBe(sampleTextFor('en'));
  });

  it('maps providers without inventing voices', () => {
    const opts = toTtsProviderOptions([
      {
        id: 'elevenlabs',
        label: 'ElevenLabs',
        quotaNote: '',
        quality: '',
        review: '',
        keyHeader: '',
        consoleUrl: '',
        defaultVoiceId: 'x',
        hasCustomKeys: true,
      },
    ]);
    expect(opts[0].value).toBe('default');
    expect(opts.length).toBe(2);
  });

  it('maps live voices 1:1 with no mocks', () => {
    const opts = toVoiceOptions([
      { id: 'v1', name: 'Nova', lang: 'en-US', gender: 'female' },
    ]);
    expect(opts).toEqual([{ value: 'v1', label: 'Nova · female' }]);
    expect(toVoiceOptions([])).toEqual([]);
  });

  it('maps live TTS models 1:1', () => {
    expect(toTtsModelOptions([])).toEqual([]);
    expect(toTtsModelOptions([{ id: 'tts-1', name: 'TTS-1' }])).toEqual([
      { value: 'tts-1', label: 'TTS-1' },
    ]);
  });
});
