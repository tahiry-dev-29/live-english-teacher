/**
 * Unit tests — synthesis: elevenlabs + openai (T99 split).
 * Azure/google/polly/minimax live in tts-synthesize-vendors.spec.ts.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DoubleSynth,
  mockElevenAudio,
  mockFetchFail,
  mockFetchOk,
  mockFetchThrows,
} from './tts-synthesize.double.ts';

let synth: DoubleSynth;

describe('TtsSynthesizeService', () => {
  beforeEach(() => {
    synth = new DoubleSynth(mockElevenAudio());
  });

  describe('elevenlabs', () => {
    it('uses server fallback without a user key', async () => {
      const out = await synth.elevenLabs('Hello', 'v1', '');
      assert.ok(Buffer.from(out!.audioData, 'base64').toString().includes('eleven:Hello'));
    });

    it('uses custom fetch with a user key', async () => {
      const audio = Buffer.from('fake-audio').buffer as ArrayBuffer;
      const svc = new DoubleSynth(mockElevenAudio(), mockFetchOk(audio));
      const out = await svc.elevenLabs('Hello', 'v1', 'sk-eleven');
      assert.equal(out?.mimeType, 'audio/mpeg');
    });

    it('falls back to server audio when custom fetch fails', async () => {
      const svc = new DoubleSynth(mockElevenAudio(), mockFetchFail());
      const out = await svc.elevenLabs('Hello', 'v1', 'sk-eleven');
      assert.ok(Buffer.from(out!.audioData, 'base64').toString().includes('eleven:Hello'));
    });
  });

  describe('openai', () => {
    it('returns null without API key', async () => {
      assert.equal(await synth.openAi('Hello', 'alloy', 'tts-1', ''), null);
    });

    it('returns audio with key and mock fetch', async () => {
      const audio = Buffer.from('openai-audio').buffer as ArrayBuffer;
      const svc = new DoubleSynth(mockElevenAudio(), mockFetchOk(audio));
      const out = await svc.openAi('Hello', 'alloy', 'tts-1', 'sk-openai');
      assert.equal(out?.mimeType, 'audio/mpeg');
    });

    it('returns null when API fails or throws', async () => {
      const fail = new DoubleSynth(mockElevenAudio(), mockFetchFail(403));
      assert.equal(await fail.openAi('Hello', 'alloy', 'tts-1', 'k'), null);
      const boom = new DoubleSynth(mockElevenAudio(), mockFetchThrows());
      assert.equal(await boom.openAi('Hello', 'alloy', 'tts-1', 'k'), null);
    });
  });
});
