/**
 * Unit tests — TTS transport helpers (real axios wrapper, stubbed adapter).
 * The upstream status + body must survive: that is what made the old 503
 * impossible to diagnose.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TTS_REQUEST_TIMEOUT_MS,
  audioSuccess,
  getJson,
  postForAudio,
  postForJson,
} from './tts-http.util.ts';
import {
  audioReply,
  errorReply,
  jsonReply,
  stubAxios,
} from './tts-http-doubles.spec-helper.ts';

describe('tts-http.util (axios)', () => {
  it('uses a hard timeout so a stuck TTS call cannot freeze playback', () => {
    assert.equal(TTS_REQUEST_TIMEOUT_MS, 15_000);
  });

  describe('postForAudio', () => {
    it('returns the audio bytes for a 2xx response', async () => {
      const stub = stubAxios(() => audioReply('mp3-bytes'));
      const out = await postForAudio(
        'https://tts.test/v1',
        { text: 'hi' },
        { 'xi-api-key': 'sk-test' },
      );
      stub.restore();

      assert.equal(out.ok, true);
      if (out.ok === true) assert.equal(out.data.toString(), 'mp3-bytes');
      assert.equal(stub.calls[0].method, 'POST');
      assert.ok(JSON.stringify(stub.calls[0].headers).includes('sk-test'));
    });

    it('returns the upstream status + body for a 4xx response', async () => {
      const body = '{"code":"quota_exceeded"}';
      const stub = stubAxios(() => errorReply(429, body));
      const out = await postForAudio('https://tts.test/v1', {}, {});
      stub.restore();

      assert.equal(out.ok, false);
      if (out.ok === false) {
        assert.equal(out.status, 429);
        assert.equal(out.body, body);
      }
    });

    it('serializes a JSON error body so the classifier can read it', async () => {
      const stub = stubAxios(() =>
        errorReply(401, { detail: { code: 'quota_exceeded' } }),
      );
      const out = await postForAudio('https://tts.test/v1', {}, {});
      stub.restore();

      assert.equal(out.ok, false);
      if (out.ok === false) assert.ok(out.body.includes('quota_exceeded'));
    });

    it('decodes a Buffer error body (axios arraybuffer) into readable text', async () => {
      const stub = stubAxios(() =>
        errorReply(401, Buffer.from('{"code":"quota_exceeded"}')),
      );
      const out = await postForAudio('https://tts.test/v1', {}, {});
      stub.restore();

      assert.equal(out.ok, false);
      if (out.ok === false) {
        assert.ok(out.body.includes('quota_exceeded'), out.body);
        assert.ok(!out.body.includes('"type":"Buffer"'), out.body);
      }
    });

    it('reports a network failure as status 0 with the reason', async () => {
      const stub = stubAxios(() => {
        throw new Error('ECONNREFUSED');
      });
      const out = await postForAudio('https://tts.test/v1', {}, {});
      stub.restore();

      assert.equal(out.ok, false);
      if (out.ok === false) {
        assert.equal(out.status, 0);
        assert.ok(out.body.includes('ECONNREFUSED'));
      }
    });
  });

  describe('postForJson', () => {
    it('returns the JSON envelope on success', async () => {
      const stub = stubAxios(() => jsonReply({ audioContent: 'b64==' }));
      const out = await postForJson('https://tts.test/v1', { text: 'hi' }, {});
      stub.restore();

      assert.equal(out.ok, true);
      if (out.ok === true) {
        assert.equal(
          (out.data as { audioContent: string }).audioContent,
          'b64==',
        );
      }
    });

    it('keeps the status + body for a failed response', async () => {
      const stub = stubAxios(() => errorReply(403, 'forbidden'));
      const out = await postForJson('https://tts.test/v1', {}, {});
      stub.restore();

      assert.equal(out.ok, false);
      if (out.ok === false) {
        assert.equal(out.status, 403);
        assert.equal(out.body, 'forbidden');
      }
    });
  });

  describe('getJson', () => {
    it('GETs with the caller headers and returns the payload', async () => {
      const stub = stubAxios(() => jsonReply({ voices: [] }));
      const out = await getJson('https://api.elevenlabs.io/v1/voices', {
        'xi-api-key': 'sk-test',
      });
      stub.restore();

      assert.equal(out.ok, true);
      assert.equal(stub.calls[0].method, 'GET');
      assert.ok(JSON.stringify(stub.calls[0].headers).includes('sk-test'));
      if (out.ok === true) {
        assert.deepEqual(out.data, { voices: [] });
      }
    });

    it('surfaces a 401 permission error instead of an empty result', async () => {
      const stub = stubAxios(() =>
        errorReply(401, {
          detail: { message: 'The API key you used is missing the permission' },
        }),
      );
      const out = await getJson('https://api.elevenlabs.io/v1/voices', {});
      stub.restore();

      assert.equal(out.ok, false);
      if (out.ok === false) assert.equal(out.status, 401);
    });
  });

  describe('audioSuccess', () => {
    it('encodes the buffer as base64 mp3', () => {
      const out = audioSuccess(Buffer.from('hello-audio'));
      assert.equal(out.ok, true);
      assert.equal(out.mimeType, 'audio/mpeg');
      assert.equal(
        Buffer.from(out.audioData, 'base64').toString(),
        'hello-audio',
      );
    });

    it('accepts an ArrayBuffer and a custom mime type', () => {
      const out = audioSuccess(
        new TextEncoder().encode('wav').buffer,
        'audio/wav',
      );
      assert.equal(out.mimeType, 'audio/wav');
      assert.equal(Buffer.from(out.audioData, 'base64').toString(), 'wav');
    });
  });
});
