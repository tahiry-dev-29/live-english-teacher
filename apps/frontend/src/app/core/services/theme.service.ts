import { Injectable, signal, effect, inject, DOCUMENT } from '@angular/core';
import {
  migrateLocalStorageToCookie,
  readCookie,
  writeCookie,
} from '../utils/cookie.util';

export type Theme = 'dark' | 'light' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

/**
 * Thème applicatif 100% Angular : aucun script inline dans index.html.
 *
 * - Instancié au boot via `provideAppInitializer` (cf. app.config.ts) :
 *   `data-theme` est posé avant le premier rendu — pas de flash.
 * - Réactivité signals : `effect()` persiste le cookie + applique le DOM
 *   à chaque changement (zoneless-safe).
 * - Persistance : cookie `app_theme` (Max-Age 1 an, Path=/, SameSite=Lax).
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private static readonly COOKIE_NAME = 'app_theme';
  private static readonly LEGACY_STORAGE_KEY = 'app_theme';
  private static readonly FONT_SIZE_STORAGE_KEY = 'app_font_size';
  /** 1 an — le thème est une préférence durable, pas une donnée de session. */
  private static readonly COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

  private readonly document = inject(DOCUMENT);

  readonly theme = signal<Theme>(this.load());
  readonly resolvedTheme = signal<string>('halloween');
  readonly fontSize = signal<FontSize>(this.loadFontSize());

  constructor() {
    // Pose synchrone dès l'instanciation au boot → avant le 1er paint, anti-flash.
    this.applyTheme(this.theme());
    this.applyFontSize(this.fontSize());

    effect(() => {
      const t = this.theme();
      this.saveCookie(t);
      this.applyTheme(t);
    });

    if (typeof window !== 'undefined') {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => {
          if (this.theme() === 'system') {
            this.applyTheme('system');
          }
        });
    }
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  setFontSize(size: FontSize): void {
    this.fontSize.set(size);
    this.applyFontSize(size);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ThemeService.FONT_SIZE_STORAGE_KEY, size);
      }
    } catch {
      // ignore
    }
  }

  private applyFontSize(size: FontSize): void {
    const doc = this.document;
    if (!doc) return;
    const sizeMap: Record<FontSize, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    doc.documentElement.style.fontSize = sizeMap[size] ?? '16px';
  }

  private loadFontSize(): FontSize {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(
          ThemeService.FONT_SIZE_STORAGE_KEY,
        ) as FontSize | null;
        if (saved === 'small' || saved === 'medium' || saved === 'large') {
          return saved;
        }
      }
    } catch {
      // ignore
    }
    return 'medium';
  }

  private applyTheme(theme: Theme): void {
    const doc = this.document;
    if (!doc) return;

    let resolved: string;
    if (theme === 'system') {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'halloween' : 'emerald';
    } else {
      resolved = theme === 'dark' ? 'halloween' : 'emerald';
    }

    doc.documentElement.setAttribute('data-theme', resolved);
    this.resolvedTheme.set(resolved);

    // Swap favicon, apple-touch-icon, manifest and meta theme-color to match the resolved theme.
    this.applyFavicon(resolved === 'halloween');
  }

  /**
   * Dynamically swaps every theme-aware `<link>` (favicon, apple-touch-icon,
   * manifest) and the `theme-color` `<meta>` so that the browser UI, home-screen
   * shortcut icon and installed-PWA assets always match the active theme.
   * The available paths are stored in `data-light` / `data-dark` attributes
   * that are rendered by index.html.
   */
  private applyFavicon(isDark: boolean): void {
    const doc = this.document;
    if (!doc) return;

    const links = doc.querySelectorAll<HTMLLinkElement>(
      'link[data-light][data-dark]',
    );
    links.forEach((el) => {
      const href = isDark ? el.dataset['dark'] : el.dataset['light'];
      if (href && el.getAttribute('href') !== href) {
        el.setAttribute('href', href);
      }
    });

    const metaTc = doc.getElementById('meta-theme-color');
    if (metaTc) {
      const computedColor =
        typeof window !== 'undefined'
          ? getComputedStyle(doc.documentElement)
              .getPropertyValue('--color-base-100')
              .trim()
          : '';
      const color = computedColor || (isDark ? '#212121' : '#ffffff');
      if (metaTc.getAttribute('content') !== color) {
        metaTc.setAttribute('content', color);
      }
    }
  }

  private saveCookie(theme: Theme): void {
    const doc = this.document;
    if (!doc) return;
    try {
      const secure =
        typeof window !== 'undefined' && window.location.protocol === 'https:'
          ? '; Secure'
          : '';
      doc.cookie =
        `${ThemeService.COOKIE_NAME}=${encodeURIComponent(theme)}` +
        `; Max-Age=${ThemeService.COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    } catch {
      // Cookies bloqués : le thème reste appliqué en mémoire pour la session.
    }
  }

  private readCookie(): Theme | null {
    const doc = this.document;
    if (!doc) return null;
    try {
      const cookies = doc.cookie ? doc.cookie.split('; ') : [];
      for (const part of cookies) {
        const [name, ...rest] = part.split('=');
        if (name === ThemeService.COOKIE_NAME) {
          const value = decodeURIComponent(rest.join('='));
          if (value === 'dark' || value === 'light' || value === 'system')
            return value;
          return null;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  private load(): Theme {
    // 1. Cookie = source de vérité.
    const fromCookie = this.readCookie();
    if (fromCookie) return fromCookie;

    // 2. Migration one-shot depuis l'ancien localStorage, puis nettoyage.
    try {
      if (typeof localStorage !== 'undefined') {
        const legacy = localStorage.getItem(
          ThemeService.LEGACY_STORAGE_KEY,
        ) as Theme | null;
        if (legacy === 'dark' || legacy === 'light' || legacy === 'system') {
          this.saveCookie(legacy);
          localStorage.removeItem(ThemeService.LEGACY_STORAGE_KEY);
          return legacy;
        }
      }
    } catch {
      // localStorage indisponible : on ignore.
    }

    return 'dark';
  }
}
