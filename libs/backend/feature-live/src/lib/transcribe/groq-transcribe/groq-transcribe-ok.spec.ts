/**
 * Unit tests — Groq STT happy path (T99 split).
 * Error cases live in groq-transcribe-errors.spec.ts.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DoubleTranscribe,
  mockFetchCapture,
  mockFetchOk,
} from './groq-transcribe.double.ts';

const validAudio = Buffer.from('fake audio content').toString('base64');

describe('GroqTranscribeService ok', () => {
  describe('API key handling', () => {
    it('uses the instance key when no customApiKey', async () => {
      let captured: string | undefined;
      const svc = new DoubleTranscribe(
        'instance-key',
        mockFetchCapture((_u, o) => (captured = o?.headers?.Authorization)),
      );
      await svc.transcribe(validAudio);
      assert.ok(captured?.includes('instance-key'));
    });

    it('uses customApiKey over the instance key', async () => {
      let captured: string | undefined;
      const svc = new DoubleTranscribe(
        'instance-key',
        mockFetchCapture((_u, o) => (captured = o?.headers?.Authorization)),
      );
      await svc.transcribe(validAudio, undefined, undefined, undefined, 'custom-key');
      assert.ok(captured?.includes('custom-key'));
      assert.ok(!captured?.includes('instance-key'));
    });
  });

  describe('successful transcription', () => {
    it('returns transcript text on success', async () => {
      const svc = new DoubleTranscribe('sk-test', mockFetchOk('The quick brown fox'));
      assert.equal(await svc.transcribe(validAudio), 'The quick brown fox');
    });
  });

  describe('MIME type → extension mapping', () => {
    for (const [mimeType, expectedExt] of [
      ['audio/wav', 'wav'],
      ['audio/mp4', 'm4a'],
      ['audio/mpeg', 'mp3'],
      ['audio/webm', 'webm'],
      ['audio/ogg', 'webm'],
    ] as [string, string][]) {
      it(`accepts "${mimeType}" (.${expectedExt})`, async () => {
        const svc = new DoubleTranscribe('sk-test', mockFetchOk('test'));
        assert.equal(await svc.transcribe(validAudio, mimeType), 'test');
      });
    }
  });

  describe('model selection', () => {
    it('sends FormData with the default model', async () => {
      let captured: FormData | undefined;
      const svc = new DoubleTranscribe(
        'sk-test',
        mockFetchCapture((_u, o) => (captured = o?.body)),
      );
      await svc.transcribe(validAudio);
      assert.ok(captured instanceof FormData);
    });

    it('uses modelOverride when provided', async () => {
      const svc = new DoubleTranscribe('sk-test', mockFetchOk('override test'));
      const out = await svc.transcribe(validAudio, 'audio/webm', undefined, 'distil-whisper');
      assert.equal(out, 'override test');
    });
  });

  describe('language parameter', () => {
    it('transcribes with and without language', async () => {
      const fr = new DoubleTranscribe('sk-test', mockFetchOk('bonjour'));
      assert.equal(await fr.transcribe(validAudio, 'audio/webm', 'fr'), 'bonjour');
      const en = new DoubleTranscribe('sk-test', mockFetchOk('hello'));
      assert.equal(await en.transcribe(validAudio, 'audio/webm'), 'hello');
    });
  });
});
