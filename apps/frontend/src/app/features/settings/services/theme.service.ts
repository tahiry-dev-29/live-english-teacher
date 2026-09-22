import {
  Injectable,
  signal,
  effect,
  inject,
  DestroyRef,
  DOCUMENT,
} from '@angular/core';
import {
  clampFontPx,
  fontCssFor,
  fontSizeToPx,
  resolveThemeName,
  type FontFamily,
  type FontSize,
  type Theme,
} from './theme-tokens.util';
import { ThemePersistenceService } from './theme-persistence.service';

/**
 * Application theme 100% Angular: no inline scripts in index.html.
 *
 * - Instantiated at boot via `provideAppInitializer` (see app.config.ts):
 *   `data-theme` is set before the first render — no flash.
 * - Signal reactivity: `effect()` persists the cookie + applies DOM
 *   on every change (zoneless-safe).
 * - Persistence: cookies `app_theme` and `app_font_size` via
 *   `ThemePersistenceService` (Expires 365 days, Path=/, SameSite=Lax).
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly persistence = inject(ThemePersistenceService);

  readonly theme = signal<Theme>(this.persistence.loadTheme());
  readonly resolvedTheme = signal<string>('app-dark');
  readonly fontSize = signal<FontSize>(this.persistence.loadFontSize());
  readonly fontFamily = signal<FontFamily>(this.persistence.loadFontFamily());
  /** Custom font size in px — only active when fontSize() === 'custom' */
  readonly customFontSizePx = signal<number>(
    this.persistence.loadCustomFontSizePx(),
  );

  constructor() {
    // Synchronous set at boot instantiation → before first paint, anti-flash.
    this.applyTheme(this.theme());
    this.applyFontSize(this.fontSize(), this.customFontSizePx());
    this.applyFontFamily(this.fontFamily());

    effect(() => {
      const t = this.theme();
      this.persistence.saveTheme(t);
      this.applyTheme(t);
    });

    effect(() => {
      const s = this.fontSize();
      const px = this.customFontSizePx();
      this.persistence.saveFontSize(s);
      this.applyFontSize(s, px);
    });

    effect(() => {
      const f = this.fontFamily();
      this.persistence.saveFontFamily(f);
      this.applyFontFamily(f);
    });

    if (typeof window !== 'undefined') {
      const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const onSchemeChange = (): void => {
        if (this.theme() === 'system') {
          this.applyTheme('system');
        }
      };
      schemeQuery.addEventListener('change', onSchemeChange);
      inject(DestroyRef).onDestroy(() =>
        schemeQuery.removeEventListener('change', onSchemeChange),
      );
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
    const clamped = clampFontPx(px);
    this.customFontSizePx.set(clamped);
    this.persistence.saveCustomFontSizePx(clamped);
    if (this.fontSize() === 'custom') {
      this.applyFontSize('custom', clamped);
    }
  }

  private applyFontSize(size: FontSize, customPx: number): void {
    const doc = this.document;
    if (!doc) return;
    doc.documentElement.style.fontSize = fontSizeToPx(size, customPx);
  }

  private applyFontFamily(family: FontFamily): void {
    const doc = this.document;
    if (!doc) return;
    const css = fontCssFor(family);
    doc.documentElement.style.setProperty('--font-family-base', css);
    (doc.documentElement.style as CSSStyleDeclaration & Record<string, string>)[
      'fontFamily'
    ] = css;
  }

  private applyTheme(theme: Theme): void {
    const doc = this.document;
    if (!doc) return;

    let resolved: string;
    if (theme === 'system') {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = resolveThemeName(theme, prefersDark);
    } else {
      resolved = resolveThemeName(theme, false);
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
}
