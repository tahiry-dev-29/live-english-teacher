/**
 * Unit tests — Groq STT error cases (T99 split).
 * Happy path lives in groq-transcribe-ok.spec.ts.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DoubleTranscribe,
  mockFetchError,
  mockFetchOk,
  mockFetchThrows,
} from './groq-transcribe.double.ts';

const validAudio = Buffer.from('fake audio content').toString('base64');

describe('GroqTranscribeService errors', () => {
  it('returns null with no API key at all', async () => {
    const svc = new DoubleTranscribe('', mockFetchOk('hello'));
    assert.equal(await svc.transcribe(validAudio), null);
  });

  it('returns null on non-OK status', async () => {
    const svc = new DoubleTranscribe('sk-test', mockFetchError(401));
    assert.equal(await svc.transcribe(validAudio), null);
  });

  it('returns null when fetch throws', async () => {
    const svc = new DoubleTranscribe('sk-test', mockFetchThrows());
    assert.equal(await svc.transcribe(validAudio), null);
  });

  it('returns null when the response has no text field', async () => {
    const empty = (async () =>
      ({ ok: true, json: async () => ({}) }) as unknown as Response) as typeof fetch;
    const svc = new DoubleTranscribe('sk-test', empty);
    assert.equal(await svc.transcribe(validAudio), null);
  });
});
