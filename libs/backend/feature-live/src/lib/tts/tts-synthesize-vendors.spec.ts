/**
 * Unit tests — synthesis: azure + google + polly + minimax (T99 split).
 * Elevenlabs/openai live in tts-synthesize.spec.ts.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DoubleSynth,
  mockElevenAudio,
  mockFetchOk,
} from './tts-synthesize.double.ts';

let synth: DoubleSynth;

describe('TtsSynthesizeService vendors', () => {
  beforeEach(() => {
    synth = new DoubleSynth(mockElevenAudio());
  });

  describe('azure', () => {
    it('returns null without API key', async () => {
      assert.equal(await synth.azure('Hello', 'v', ''), null);
    });

    it('returns audio with key', async () => {
      const audio = Buffer.from('azure-audio').buffer as ArrayBuffer;
      const svc = new DoubleSynth(mockElevenAudio(), mockFetchOk(audio));
      assert.ok(await svc.azure('Hello', 'v', 'az-key'));
    });
  });

  describe('google', () => {
    it('returns null without API key', async () => {
      assert.equal(await synth.google('Hello', 'v', ''), null);
    });

    it('returns audio from audioContent field', async () => {
      const svc = new DoubleSynth(
        mockElevenAudio(),
        mockFetchOk({ audioContent: 'base64audio==' }),
      );
      const out = await svc.google('Hello', 'v', 'gcp-key');
      assert.equal(out?.audioData, 'base64audio==');
    });

    it('returns null when audioContent is missing', async () => {
      const svc = new DoubleSynth(mockElevenAudio(), mockFetchOk({}));
      assert.equal(await svc.google('Hello', 'v', 'gcp-key'), null);
    });
  });

  describe('polly', () => {
    it('returns null (stub not implemented)', async () => {
      assert.equal(await synth.polly(), null);
    });
  });

  describe('minimax', () => {
    it('returns null without API key', async () => {
      assert.equal(await synth.minimax('Hello', 'v', ''), null);
    });

    it('returns audio from data.audio field', async () => {
      const svc = new DoubleSynth(
        mockElevenAudio(),
        mockFetchOk({ data: { audio: 'minimax-b64' } }),
      );
      const out = await svc.minimax('Hello', 'v', 'mm-key');
      assert.equal(out?.audioData, 'minimax-b64');
    });

    it('returns null when data.audio is missing', async () => {
      const svc = new DoubleSynth(
        mockElevenAudio(),
        mockFetchOk({ data: {} }),
      );
      assert.equal(await svc.minimax('Hello', 'v', 'mm-key'), null);
    });
  });
});
