import { CookieService } from 'ngx-cookie-service';

/**
 * Adaptateur unique au-dessus de `ngx-cookie-service` pour les 4 préférences
 * persistées en cookies : `app_theme`, `app_font_size`, `app_language`,
 * `ai_provider`, `ai_model`.
 *
 * - 365 jours ≈ Max-Age 1 an, `Path=/`, `SameSite=Lax`, `Secure` auto en https.
 * - `CookieService` gère l'encodage, le parsing et le garde SSR
 *   (`isPlatformBrowser`) — pas de `document.cookie` manuel dans les services.
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
    // Cookies bloqués : la préférence reste en mémoire pour la session.
  }
}

/**
 * Migration one-shot depuis l'ancien localStorage vers le cookie,
 * puis nettoyage de la clé legacy. Retourne la valeur migrée ou null.
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
      // Compat : anciennes valeurs stockées via JSON.stringify.
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
