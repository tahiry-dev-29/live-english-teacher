/**
 * Unit tests — TTS failure taxonomy (real util, no network).
 * Covers the 503 regression: ElevenLabs answers 401 for an exhausted quota.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TTS_ERROR_CODES,
  TTS_FAILURE_STATUS,
  classifyTtsFailure,
  missingKeyFailure,
  planDefaultRetry,
  unsupportedProviderFailure,
} from './tts-failure.util.ts';
import { ELEVEN_QUOTA_BODY } from './tts-http-doubles.spec-helper.ts';

describe('tts-failure.util', () => {
  describe('classifyTtsFailure', () => {
    it('maps ElevenLabs quota_exceeded (HTTP 401) to QUOTA_EXCEEDED', () => {
      const failure = classifyTtsFailure('elevenlabs', 401, ELEVEN_QUOTA_BODY);
      assert.equal(failure.code, 'QUOTA_EXCEEDED');
      assert.equal(failure.provider, 'elevenlabs');
      assert.equal(failure.status, 401);
      assert.ok(failure.detail?.includes('quota'));
    });

    it('maps 429/402 to QUOTA_EXCEEDED', () => {
      assert.equal(classifyTtsFailure('openai', 429).code, 'QUOTA_EXCEEDED');
      assert.equal(classifyTtsFailure('openai', 402).code, 'QUOTA_EXCEEDED');
    });

    it('maps 401/403 without quota hint to INVALID_API_KEY', () => {
      const body = JSON.stringify({ error: { message: 'Unauthorized' } });
      assert.equal(
        classifyTtsFailure('openai', 401, body).code,
        'INVALID_API_KEY',
      );
      assert.equal(
        classifyTtsFailure('azure', 403, 'missing the permission').code,
        'INVALID_API_KEY',
      );
    });

    it('maps 400/404/422 to VOICE_UNAVAILABLE', () => {
      for (const status of [400, 404, 422]) {
        assert.equal(
          classifyTtsFailure('elevenlabs', status, 'voice not found').code,
          'VOICE_UNAVAILABLE',
        );
      }
    });

    it('maps unknown statuses to PROVIDER_UNAVAILABLE', () => {
      assert.equal(
        classifyTtsFailure('polly', 500).code,
        'PROVIDER_UNAVAILABLE',
      );
      assert.equal(
        classifyTtsFailure('polly', 0, 'network down').code,
        'PROVIDER_UNAVAILABLE',
      );
    });

    it('truncates the upstream detail to 200 chars', () => {
      const failure = classifyTtsFailure('google', 500, 'x'.repeat(500));
      assert.equal(failure.detail?.length, 200);
    });
  });

  describe('status + codes', () => {
    it('exposes the documented HTTP status per code', () => {
      assert.equal(TTS_FAILURE_STATUS.QUOTA_EXCEEDED, 429);
      assert.equal(TTS_FAILURE_STATUS.INVALID_API_KEY, 401);
      assert.equal(TTS_FAILURE_STATUS.MISSING_API_KEY, 401);
      assert.equal(TTS_FAILURE_STATUS.VOICE_UNAVAILABLE, 400);
      assert.equal(TTS_FAILURE_STATUS.UNSUPPORTED_PROVIDER, 400);
      assert.equal(TTS_FAILURE_STATUS.PROVIDER_UNAVAILABLE, 502);
    });

    it('exposes stable codes for the frontend contract', () => {
      assert.equal(TTS_ERROR_CODES.quotaExceeded, 'QUOTA_EXCEEDED');
      assert.equal(missingKeyFailure('azure').code, 'MISSING_API_KEY');
      const unsupported = unsupportedProviderFailure('browser');
      assert.equal(unsupported.code, 'UNSUPPORTED_PROVIDER');
      assert.equal(unsupported.provider, 'browser');
    });

    it('keeps the provider on every failure (never a bare 503)', () => {
      const failure = classifyTtsFailure('elevenlabs', 500);
      assert.equal(failure.ok, false);
      assert.equal(failure.provider, 'elevenlabs');
      assert.notEqual(failure.code, undefined);
    });
  });

  describe('planDefaultRetry', () => {
    const defaults = { voiceId: 'default-voice', modelId: 'default-model' };

    it('retries once with defaults when the stored voice is stale', () => {
      const plan = planDefaultRetry(
        classifyTtsFailure('elevenlabs', 400, 'voice not found'),
        { voiceId: 'stale-voice' },
        defaults,
      );
      assert.deepEqual(plan, defaults);
    });

    it('retries when only the stored model is stale', () => {
      const plan = planDefaultRetry(
        classifyTtsFailure('elevenlabs', 400, 'model not found'),
        { voiceId: defaults.voiceId, modelId: 'stale-model' },
        defaults,
      );
      assert.deepEqual(plan, defaults);
    });

    it('does not retry an exhausted quota (no wasted credits)', () => {
      const plan = planDefaultRetry(
        classifyTtsFailure('elevenlabs', 401, '{"code":"quota_exceeded"}'),
        { voiceId: 'stale-voice' },
        defaults,
      );
      assert.equal(plan, null);
    });

    it('does not retry an invalid key', () => {
      const plan = planDefaultRetry(
        classifyTtsFailure('elevenlabs', 401, 'invalid api key'),
        { voiceId: 'stale-voice' },
        defaults,
      );
      assert.equal(plan, null);
    });

    it('does not retry when the request already uses the defaults', () => {
      const plan = planDefaultRetry(
        classifyTtsFailure('elevenlabs', 400, 'voice not found'),
        { voiceId: defaults.voiceId, modelId: defaults.modelId },
        defaults,
      );
      assert.equal(plan, null);
    });
  });
});
