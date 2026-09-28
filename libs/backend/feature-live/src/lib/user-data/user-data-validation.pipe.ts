import { HttpException, HttpStatus } from '@nestjs/common';
import { SHARED_MESSAGES } from '@shared/constants';
import { MemoryQuotaError, type OwnerScope } from './user-memory.service';

/**
 * Header/query → OwnerScope extraction (T100: pulled out of
 * UserDataController; task 105: model scoping + write guard).
 * Throws 400 when x-device-key is missing or blank, or when x-ai-model /
 * ?model is present but not shaped like `provider:modelId`.
 */
export function toScope(
  deviceKey?: string,
  userId?: string,
  aiModel?: string,
): OwnerScope {
  const key = (deviceKey ?? '').trim();
  if (!key) {
    throw new HttpException(
      'Missing x-device-key header.',
      HttpStatus.BAD_REQUEST,
    );
  }
  return {
    userId: userId?.trim() || undefined,
    deviceKey: key,
    modelScope: parseModelScope(aiModel),
  };
}

/** `x-ai-model` / `?model` → `'provider:modelId'`, null when absent. */
export function parseModelScope(aiModel?: string): string | null {
  const raw = (aiModel ?? '').trim();
  if (!raw) return null;
  if (!/^[^:\s]+:[^:\s]+$/.test(raw)) {
    throw new HttpException(
      'Invalid model scope. Expected "provider:modelId".',
      HttpStatus.BAD_REQUEST,
    );
  }
  return raw;
}

/**
 * Writes are owner-only. Guests (deviceKey, no x-user-id) are read-only
 * until task 28 auth lands — the frontend already renders that state.
 */
export function requireOwner(scope: OwnerScope): void {
  if (!scope.userId) {
    throw new HttpException(
      {
        code: 'authRequired',
        message: SHARED_MESSAGES.error.authRequired,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/** Write target: 'global' forces NULL, 'model' needs a resolved scope. */
export function toWriteScope(
  scope: OwnerScope,
  dtoScope: 'global' | 'model',
): OwnerScope {
  if (dtoScope === 'global') return { ...scope, modelScope: null };
  if (!scope.modelScope) {
    throw new HttpException(
      'x-ai-model header is required to save a model memory.',
      HttpStatus.BAD_REQUEST,
    );
  }
  return scope;
}

/** Map domain errors to HTTP status (401 / 404 / 409 / 400). */
export function toHttp(error: unknown): HttpException {
  if (error instanceof MemoryQuotaError) {
    return new HttpException(
      {
        code: 'memoryQuotaReached',
        message: SHARED_MESSAGES.error.memoryQuotaReached(
          error.used,
          error.max,
        ),
        used: error.used,
        max: error.max,
      },
      HttpStatus.CONFLICT,
    );
  }
  const message = error instanceof Error ? error.message : 'Request failed.';
  if (/not found/i.test(message)) {
    return new HttpException(message, HttpStatus.NOT_FOUND);
  }
  if (/full|already exists|built-in/i.test(message)) {
    return new HttpException(message, HttpStatus.CONFLICT);
  }
  return new HttpException(message, HttpStatus.BAD_REQUEST);
}
