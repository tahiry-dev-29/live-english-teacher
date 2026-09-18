import { CookieService } from 'ngx-cookie-service';

/**
 * Single adapter above `ngx-cookie-service` for the 4 preferences
 * persisted in cookies: `app_theme`, `app_font_size`, `app_language`,
 * `ai_provider`, `ai_model`.
 *
 * - 365 days ≈ Max-Age 1 year, `Path=/`, `SameSite=Lax`, `Secure` auto on https.
 * - `CookieService` handles encoding, parsing and SSR guard
 *   (`isPlatformBrowser`) — no manual `document.cookie` in services.
 */
export const PREF_COOKIE_EXPIRES_DAYS = 365;
export const PREF_COOKIE_PATH = '/';

function isHttps(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

export function readPrefCookie(
  cookies: CookieService,
  name: string,
): string | null {
  try {
    if (!cookies.check(name)) return null;
    const value = cookies.get(name);
    return value ? value : null;
  } catch {
    return null;
  }
}

export function writePrefCookie(
  cookies: CookieService,
  name: string,
  value: string,
): void {
  try {
    cookies.set(name, value, {
      expires: PREF_COOKIE_EXPIRES_DAYS,
      path: PREF_COOKIE_PATH,
      secure: isHttps(),
      sameSite: 'Lax',
    });
  } catch {
    // Cookies blocked: preference stays in memory for the session.
  }
}

/**
 * One-shot migration from legacy localStorage to cookie,
 * then cleanup of the legacy key. Returns the migrated value or null.
 */
export function migrateLocalStorageToCookie(
  name: string,
  parse?: (raw: string) => string | null,
): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(name);
    if (raw === null) return null;
    let value: string | null = raw;
    if (parse) {
      try {
        value = parse(raw);
      } catch {
        value = null;
      }
    } else if (raw.startsWith('"') && raw.endsWith('"')) {
      // Compat: legacy values stored via JSON.stringify.
      try {
        value = JSON.parse(raw) as string;
      } catch {
        value = raw;
      }
    }
    localStorage.removeItem(name);
    return value;
  } catch {
    return null;
  }
}
