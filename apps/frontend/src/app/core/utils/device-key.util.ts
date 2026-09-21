import { CookieService } from 'ngx-cookie-service';
import { readPrefCookie, writePrefCookie } from './cookie.util';

const DEVICE_KEY_COOKIE = 'lt_device_key';

function newDeviceKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `dev_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

/**
 * Stable per-browser owner key for guests (task 28 auth will add userId).
 * Persisted in a 1-year cookie — never in localStorage (backend-only data).
 */
export function getDeviceKey(cookies: CookieService): string {
  const existing = readPrefCookie(cookies, DEVICE_KEY_COOKIE);
  if (existing) return existing;
  const created = newDeviceKey();
  writePrefCookie(cookies, DEVICE_KEY_COOKIE, created);
  // Cookies blocked (private mode): fall back to the in-memory key so the
  // session still works — data just won't survive a reload.
  return readPrefCookie(cookies, DEVICE_KEY_COOKIE) ?? created;
}
