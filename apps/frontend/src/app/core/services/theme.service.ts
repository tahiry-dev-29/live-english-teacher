import { Injectable, signal, effect, inject, DOCUMENT } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import {
  migrateLocalStorageToCookie,
  readPrefCookie,
  writePrefCookie,
} from '../utils/cookie.util';

export type Theme = 'dark' | 'light' | 'system';
export type FontSize = 'small' | 'medium' | 'large' | 'custom';
export type FontFamily =
  'system' | 'serif' | 'mono' | 'inter' | 'georgia' | 'courier';

export const FONT_FAMILIES: { id: FontFamily; label: string; css: string }[] = [
  {
    id: 'system',
    label: 'System UI',
    css: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  {
    id: 'inter',
    label: 'Inter',
    css: "'Inter', system-ui, sans-serif",
  },
  {
    id: 'serif',
    label: 'Serif',
    css: "Georgia, 'Times New Roman', serif",
  },
  {
    id: 'mono',
    label: 'Monospace',
    css: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  },
  {
    id: 'georgia',
    label: 'Georgia',
    css: 'Georgia, serif',
  },
  {
    id: 'courier',
    label: 'Courier',
    css: "'Courier New', Courier, monospace",
  },
];

/**
 * Thème applicatif 100% Angular : aucun script inline dans index.html.
 *
 * - Instancié au boot via `provideAppInitializer` (cf. app.config.ts) :
 *   `data-theme` est posé avant le premier rendu — pas de flash.
 * - Réactivité signals : `effect()` persiste le cookie + applique le DOM
 *   à chaque changement (zoneless-safe).
 * - Persistance : cookies `app_theme` et `app_font_size` via
 *   `ngx-cookie-service` (Expires 365 j, Path=/, SameSite=Lax).
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private static readonly COOKIE_NAME = 'app_theme';
  private static readonly LEGACY_STORAGE_KEY = 'app_theme';
  private static readonly FONT_SIZE_COOKIE_NAME = 'app_font_size';
  private static readonly FONT_FAMILY_COOKIE_NAME = 'app_font_family';
  private static readonly FONT_SIZE_CUSTOM_COOKIE_NAME = 'app_font_size_px';

  private readonly document = inject(DOCUMENT);
  private readonly cookies = inject(CookieService);

  readonly theme = signal<Theme>(this.load());
  readonly resolvedTheme = signal<string>('app-dark');
  readonly fontSize = signal<FontSize>(this.loadFontSize());
  readonly fontFamily = signal<FontFamily>(this.loadFontFamily());
  /** Custom font size in px — only active when fontSize() === 'custom' */
  readonly customFontSizePx = signal<number>(this.loadCustomFontSizePx());

  constructor() {
    // Pose synchrone dès l'instanciation au boot → avant le 1er paint, anti-flash.
    this.applyTheme(this.theme());
    this.applyFontSize(this.fontSize(), this.customFontSizePx());
    this.applyFontFamily(this.fontFamily());

    effect(() => {
      const t = this.theme();
      this.saveCookie(t);
      this.applyTheme(t);
    });

    effect(() => {
      const s = this.fontSize();
      const px = this.customFontSizePx();
      writePrefCookie(this.cookies, ThemeService.FONT_SIZE_COOKIE_NAME, s);
      this.applyFontSize(s, px);
    });

    effect(() => {
      const f = this.fontFamily();
      writePrefCookie(this.cookies, ThemeService.FONT_FAMILY_COOKIE_NAME, f);
      this.applyFontFamily(f);
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
  }

  setFontFamily(family: FontFamily): void {
    this.fontFamily.set(family);
  }

  setCustomFontSizePx(px: number): void {
    const clamped = Math.min(32, Math.max(10, px));
    this.customFontSizePx.set(clamped);
    writePrefCookie(
      this.cookies,
      ThemeService.FONT_SIZE_CUSTOM_COOKIE_NAME,
      String(clamped),
    );
    if (this.fontSize() === 'custom') {
      this.applyFontSize('custom', clamped);
    }
  }

  private applyFontSize(size: FontSize, customPx: number): void {
    const doc = this.document;
    if (!doc) return;
    const sizeMap: Record<FontSize, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
      custom: `${customPx}px`,
    };
    doc.documentElement.style.fontSize = sizeMap[size] ?? '16px';
  }

  private applyFontFamily(family: FontFamily): void {
    const doc = this.document;
    if (!doc) return;
    const css =
      FONT_FAMILIES.find((f) => f.id === family)?.css ??
      "system-ui, -apple-system, 'Segoe UI', sans-serif";
    doc.documentElement.style.setProperty('--font-family-base', css);
    (doc.documentElement.style as CSSStyleDeclaration & Record<string, string>)[
      'fontFamily'
    ] = css;
  }

  private loadFontFamily(): FontFamily {
    const fromCookie = readPrefCookie(
      this.cookies,
      ThemeService.FONT_FAMILY_COOKIE_NAME,
    );
    const valid: FontFamily[] = [
      'system',
      'serif',
      'mono',
      'inter',
      'georgia',
      'courier',
    ];
    return valid.includes(fromCookie as FontFamily)
      ? (fromCookie as FontFamily)
      : 'system';
  }

  private loadCustomFontSizePx(): number {
    const fromCookie = readPrefCookie(
      this.cookies,
      ThemeService.FONT_SIZE_CUSTOM_COOKIE_NAME,
    );
    const n = parseInt(fromCookie ?? '', 10);
    return isNaN(n) ? 16 : Math.min(32, Math.max(10, n));
  }

  private loadFontSize(): FontSize {
    // 1. Cookie = source de vérité.
    const fromCookie = readPrefCookie(
      this.cookies,
      ThemeService.FONT_SIZE_COOKIE_NAME,
    );
    if (
      fromCookie === 'small' ||
      fromCookie === 'medium' ||
      fromCookie === 'large'
    ) {
      return fromCookie;
    }

    // 2. Migration one-shot depuis l'ancien localStorage, puis nettoyage.
    const migrated = migrateLocalStorageToCookie(
      ThemeService.FONT_SIZE_COOKIE_NAME,
    );
    if (migrated === 'small' || migrated === 'medium' || migrated === 'large') {
      writePrefCookie(
        this.cookies,
        ThemeService.FONT_SIZE_COOKIE_NAME,
        migrated,
      );
      return migrated;
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
      resolved = prefersDark ? 'app-dark' : 'app-light';
    } else {
      resolved = theme === 'dark' ? 'app-dark' : 'app-light';
    }

    doc.documentElement.setAttribute('data-theme', resolved);
    this.resolvedTheme.set(resolved);

    // Swap favicon, apple-touch-icon, manifest and meta theme-color to match the resolved theme.
    this.applyFavicon(resolved === 'app-dark');
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
    writePrefCookie(this.cookies, ThemeService.COOKIE_NAME, theme);
  }

  private readCookie(): Theme | null {
    const value = readPrefCookie(this.cookies, ThemeService.COOKIE_NAME);
    if (value === 'dark' || value === 'light' || value === 'system')
      return value;
    return null;
  }

  private load(): Theme {
    // 1. Cookie = source de vérité.
    const fromCookie = this.readCookie();
    if (fromCookie) return fromCookie;

    // 2. Migration one-shot depuis l'ancien localStorage, puis nettoyage.
    const legacy = migrateLocalStorageToCookie(
      ThemeService.LEGACY_STORAGE_KEY,
    ) as Theme | null;
    if (legacy === 'dark' || legacy === 'light' || legacy === 'system') {
      this.saveCookie(legacy);
      return legacy;
    }

    return 'dark';
  }
}
