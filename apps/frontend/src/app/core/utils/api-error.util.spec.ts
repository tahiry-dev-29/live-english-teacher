import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import {
  formatApiError,
  formatHttpError,
  resolveApiErrorCode,
} from './api-error.util';
import { MESSAGES, ERROR_CODES } from '@core/constants/messages';
import { SHARED_MESSAGES } from '@shared/constants';

describe('api-error.util', () => {
  describe('resolveApiErrorCode', () => {
    it('returns aiServiceUnavailable for empty error string', () => {
      expect(resolveApiErrorCode('')).toBe('aiServiceUnavailable');
    });

    it('returns quotaExceeded when matching quota error code', () => {
      expect(resolveApiErrorCode(ERROR_CODES.quotaExceeded)).toBe(
        'quotaExceeded',
      );
    });

    it('returns invalidApiKey for 401 or unauthorized errors', () => {
      expect(resolveApiErrorCode('Error: 401 Unauthorized')).toBe(
        'invalidApiKey',
      );
      expect(resolveApiErrorCode('invalid api key provided')).toBe(
        'invalidApiKey',
      );
    });

    it('returns noApiKey when error indicates key is not set', () => {
      expect(resolveApiErrorCode('API key is not set')).toBe('noApiKey');
    });

    it('returns networkUnreachable for network failures', () => {
      expect(resolveApiErrorCode('Network error: failed to fetch')).toBe(
        'networkUnreachable',
      );
    });

    it('returns modelUnavailable for 404 or missing model errors', () => {
      expect(resolveApiErrorCode('404 Not Found')).toBe('modelUnavailable');
      expect(resolveApiErrorCode('model gemini-pro is not available')).toBe(
        'modelUnavailable',
      );
    });

    it('returns unknown for unrecognized errors', () => {
      expect(resolveApiErrorCode('some random unexpected error')).toBe(
        'unknown',
      );
    });
  });

  describe('formatApiError', () => {
    it('formats known errors with user friendly message', () => {
      const formatted = formatApiError('401 Unauthorized');
      expect(formatted).toBe(MESSAGES.error.invalidApiKey);
    });

    it('returns truncated message for unknown errors', () => {
      const formatted = formatApiError('Something unusual happened in backend');
      expect(formatted).toBe('Something unusual happened in backend');
    });
  });

  describe('formatHttpError', () => {
    it('prefers the backend user-facing message (TTS contract)', () => {
      const error = new HttpErrorResponse({
        status: 429,
        statusText: 'Too Many Requests',
        error: {
          statusCode: 429,
          code: 'QUOTA_EXCEEDED',
          provider: 'elevenlabs',
          message: 'ELEVENLABS: voice quota exhausted',
        },
      });
      expect(formatHttpError(error)).toBe('ELEVENLABS: voice quota exhausted');
    });

    it('keeps the curated mapping when there is no message field', () => {
      const error = new HttpErrorResponse({
        status: 401,
        error: { statusCode: 401 },
      });
      expect(formatHttpError(error)).toBe(MESSAGES.error.invalidApiKey);
    });

    it('falls back to the body when the message is not a string', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { statusCode: 400, message: ['text must be a string'] },
      });
      // No curated mapping for 400: the truncated body is shown, never "".
      expect(formatHttpError(error)).toContain('statusCode');
    });

    it('reports network errors', () => {
      expect(formatHttpError(new HttpErrorResponse({ status: 0 }))).toBe(
        MESSAGES.error.networkUnreachable,
      );
    });

    it('maps a memory-quota 409 to the shared quota message', () => {
      const error = new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict',
        error: { message: 'Memory is full (50/50).' },
      });
      expect(formatHttpError(error)).toBe(
        SHARED_MESSAGES.error.memoryQuotaReached(50, 50),
      );
    });

    it('prefers used/max fields when the quota body carries them', () => {
      const error = new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict',
        error: {
          code: 'memoryQuotaReached',
          message: 'Memory is full (50/50).',
          used: 50,
          max: 50,
        },
      });
      expect(formatHttpError(error)).toBe(
        SHARED_MESSAGES.error.memoryQuotaReached(50, 50),
      );
    });

    it('maps a guest-write 401 to the shared auth message', () => {
      const error = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: {
          code: 'authRequired',
          message: 'You must be signed in to add, edit or delete memories.',
        },
      });
      expect(formatHttpError(error)).toBe(SHARED_MESSAGES.error.authRequired);
    });
  });
});
