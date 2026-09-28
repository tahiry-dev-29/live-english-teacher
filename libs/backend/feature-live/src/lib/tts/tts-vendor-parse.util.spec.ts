/**
 * Unit tests — vendor JSON payload extraction (real util, no network).
 * google/minimax nest base64 audio inside their own envelope.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGoogleAudio,
  parseMinimaxAudio,
} from './tts-vendor-parse.util.ts';

describe('tts-vendor-parse.util', () => {
  describe('parseGoogleAudio', () => {
    it('reads audioContent', () => {
      assert.equal(parseGoogleAudio({ audioContent: 'gcp-b64' }), 'gcp-b64');
    });

    it('returns null when audioContent is missing', () => {
      assert.equal(parseGoogleAudio({}), null);
    });

    it('never throws on a null payload', () => {
      assert.equal(parseGoogleAudio(null), null);
    });
  });

  describe('parseMinimaxAudio', () => {
    it('reads data.audio', () => {
      assert.equal(
        parseMinimaxAudio({ data: { audio: 'minimax-b64' } }),
        'minimax-b64',
      );
    });

    it('returns null when data.audio is missing', () => {
      assert.equal(parseMinimaxAudio({ data: {} }), null);
    });

    it('never throws on a null payload', () => {
      assert.equal(parseMinimaxAudio(null), null);
    });
  });
});
