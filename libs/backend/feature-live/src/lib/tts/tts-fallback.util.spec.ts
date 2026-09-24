/**
 * Unit tests — tts-fallback.util (pure routing helpers).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveKey,
  resolveProviderId,
  resolveVoice,
} from './tts-fallback.util.ts';

describe('resolveProviderId', () => {
  const known = ['elevenlabs', 'azure', 'google'];

  it('defaults to elevenlabs', () => {
    assert.equal(resolveProviderId(undefined, known), 'elevenlabs');
    assert.equal(resolveProviderId('default', known), 'elevenlabs');
  });

  it('keeps known providers', () => {
    assert.equal(resolveProviderId('azure', known), 'azure');
    assert.equal(resolveProviderId('GOOGLE', known), 'google');
  });

  it('rejects unknown and browser providers', () => {
    assert.equal(resolveProviderId('nope', known), null);
    assert.equal(resolveProviderId('browser', known), null);
  });
});

describe('resolveVoice', () => {
  it('prefers the requested voice, falls back to default', () => {
    assert.equal(resolveVoice('v1', 'dflt'), 'v1');
    assert.equal(resolveVoice(undefined, 'dflt'), 'dflt');
  });
});

describe('effectiveKey', () => {
  it('prefers the user key over the server env', () => {
    assert.equal(effectiveKey('user-key', 'MISSING_ENV_XYZ'), 'user-key');
    assert.equal(effectiveKey('', 'MISSING_ENV_XYZ'), '');
    assert.equal(effectiveKey(undefined, undefined), '');
  });
});
