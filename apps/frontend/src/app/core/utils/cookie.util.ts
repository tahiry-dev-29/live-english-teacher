import type { Document } from '@angular/common';

/** 1 an — les préférences UI/IA sont durables, pas des données de session. */
export const COOKIE_MAX_AGE_1Y = 60 * 60 * 24 * 365;

export function readCookie(doc: Document | null | undefined, name: string): string | null {
  if (!doc) return null;
  try {
    const cookies = doc.cookie ? doc.cookie.split('; ') : [];
    for (const part of cookies) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      if (part.slice(0, eq) === name) {
        return decodeURIComponent(part.slice(eq + 1));
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function writeCookie(
  doc: Document | null | undefined,
  name: string,
  value: string,
  maxAge = COOKIE_MAX_AGE_1Y,
): void {
  if (!doc) return;
  try {
    const secure =
      typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? '; Secure'
        : '';
    doc.cookie =
      `${name}=${encodeURIComponent(value)}` +
      `; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
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
