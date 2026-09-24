import { HttpException, HttpStatus } from '@nestjs/common';
import type { OwnerScope } from './user-memory.service';

/**
 * Header → OwnerScope extraction (T100: pulled out of UserDataController).
 * Throws 400 when x-device-key is missing or blank.
 */
export function toScope(deviceKey?: string, userId?: string): OwnerScope {
  const key = (deviceKey ?? '').trim();
  if (!key) {
    throw new HttpException(
      'Missing x-device-key header.',
      HttpStatus.BAD_REQUEST,
    );
  }
  return userId?.trim()
    ? { userId: userId.trim(), deviceKey: key }
    : { deviceKey: key };
}

/** Map domain errors to HTTP status (404 / 409 / 400). */
export function toHttp(error: unknown): HttpException {
  const message = error instanceof Error ? error.message : 'Request failed.';
  if (/not found/i.test(message)) {
    return new HttpException(message, HttpStatus.NOT_FOUND);
  }
  if (/full|already exists|built-in/i.test(message)) {
    return new HttpException(message, HttpStatus.CONFLICT);
  }
  return new HttpException(message, HttpStatus.BAD_REQUEST);
}
