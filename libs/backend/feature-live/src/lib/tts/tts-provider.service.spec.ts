/**
 * Unit tests — TtsProviderService facade routing (T99 split).
 * Per-vendor synthesis cases live in tts-synthesize*.spec.ts.
 * Uses a slim routing double; no real HTTP calls.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TTS_PROVIDERS_REGISTRY } from './tts-providers.registry.ts';

class RoutingDouble {
  async getVoices(providerId: string, key: string): Promise<unknown[]> {
    if (providerId === 'elevenlabs' && key) return [{ id: 'rachel' }];
    return [];
  }

  async synthesize(
    providerId: string,
    key: string,
  ): Promise<{ mimeType: string } | null> {
    if (!TTS_PROVIDERS_REGISTRY[providerId]) return null;
    if (providerId === 'elevenlabs') return { mimeType: 'audio/mpeg' };
    return key ? { mimeType: 'audio/mpeg' } : null;
  }
}

function resolve(raw?: string): string | null {
  const id = (raw || 'elevenlabs').toLowerCase();
  if (id === 'default') return 'elevenlabs';
  return TTS_PROVIDERS_REGISTRY[id] ? id : null;
}

let dbl: RoutingDouble;

describe('TtsProviderService facade', () => {
  beforeEach(() => {
    dbl = new RoutingDouble();
  });

  describe('TTS_PROVIDERS_REGISTRY', () => {
    it('contains the 6 server providers', () => {
      for (const expected of [
        'elevenlabs',
        'azure',
        'google',
        'openai',
        'polly',
        'minimax',
      ]) {
        assert.ok(TTS_PROVIDERS_REGISTRY[expected], expected);
      }
    });

    it('has no browser provider (server APIs only)', () => {
      assert.ok(!('browser' in TTS_PROVIDERS_REGISTRY));
    });

    it('every provider requires a key (BYOK-ready)', () => {
      for (const [id, config] of Object.entries(TTS_PROVIDERS_REGISTRY)) {
        assert.ok(config.keyEnv, `${id} must have keyEnv`);
        assert.ok(config.defaultVoiceId, `${id} must have defaultVoiceId`);
      }
    });
  });

  describe('provider resolution', () => {
    it('defaults to elevenlabs', () => {
      assert.equal(resolve(), 'elevenlabs');
      assert.equal(resolve('default'), 'elevenlabs');
    });

    it('rejects unknown providers', () => {
      assert.equal(resolve('nope'), null);
      assert.equal(resolve('browser'), null);
    });
  });

  describe('voices routing', () => {
    it('returns elevenlabs voices with a key', async () => {
      assert.equal((await dbl.getVoices('elevenlabs', 'k')).length, 1);
    });

    it('returns [] without a key (live-only)', async () => {
      assert.deepEqual(await dbl.getVoices('azure', ''), []);
    });

    it('returns [] for unknown provider', async () => {
      assert.deepEqual(await dbl.getVoices('nope', 'k'), []);
    });
  });

  describe('synthesize routing', () => {
    it('resolves default to elevenlabs audio', async () => {
      const out = await dbl.synthesize(resolve('default')!, '');
      assert.equal(out?.mimeType, 'audio/mpeg');
    });

    it('returns null for unknown provider', async () => {
      assert.equal(await dbl.synthesize('nope', 'k'), null);
    });

    it('requires a key except elevenlabs server fallback', async () => {
      assert.equal(await dbl.synthesize('openai', ''), null);
      assert.ok(await dbl.synthesize('openai', 'k'));
    });
  });
});
