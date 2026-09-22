import { Injectable, inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import {
  migrateLocalStorageToCookie,
  readPrefCookie,
  writePrefCookie,
} from '@core/utils/cookie.util';
import {
  isFontFamily,
  isFontSizePreset,
  isTheme,
  parseCustomFontPx,
  type FontFamily,
  type FontSize,
  type Theme,
} from './theme-tokens.util';

/**
 * Cookie persistence for theme prefs (plan-001 T95 split).
 * Owns every cookie read/write + legacy localStorage migration so
 * ThemeService only deals with signals + DOM application.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemePersistenceService {
  private static readonly THEME_COOKIE = 'app_theme';
  private static readonly FONT_SIZE_COOKIE = 'app_font_size';
  private static readonly FONT_FAMILY_COOKIE = 'app_font_family';
  private static readonly FONT_SIZE_PX_COOKIE = 'app_font_size_px';

  private readonly cookies = inject(CookieService);

  loadTheme(): Theme {
    // 1. Cookie = source of truth.
    const fromCookie = readPrefCookie(
      this.cookies,
      ThemePersistenceService.THEME_COOKIE,
    );
    if (fromCookie && isTheme(fromCookie)) return fromCookie;

    // 2. One-shot migration from legacy localStorage, then cleanup.
    const legacy = migrateLocalStorageToCookie(
      ThemePersistenceService.THEME_COOKIE,
    );
    if (legacy && isTheme(legacy)) {
      this.saveTheme(legacy);
      return legacy;
    }

    return 'dark';
  }

  saveTheme(theme: Theme): void {
    writePrefCookie(this.cookies, ThemePersistenceService.THEME_COOKIE, theme);
  }

  loadFontSize(): FontSize {
    // 1. Cookie = source of truth.
    const fromCookie = readPrefCookie(
      this.cookies,
      ThemePersistenceService.FONT_SIZE_COOKIE,
    );
    if (
      fromCookie === 'small' ||
      fromCookie === 'medium' ||
      fromCookie === 'large'
    ) {
      return fromCookie;
    }

    // 2. One-shot migration from legacy localStorage, then cleanup.
    const migrated = migrateLocalStorageToCookie(
      ThemePersistenceService.FONT_SIZE_COOKIE,
    );
    if (migrated === 'small' || migrated === 'medium' || migrated === 'large') {
      writePrefCookie(
        this.cookies,
        ThemePersistenceService.FONT_SIZE_COOKIE,
        migrated,
      );
      return migrated;
    }
    return 'medium';
  }

  saveFontSize(size: FontSize): void {
    writePrefCookie(
      this.cookies,
      ThemePersistenceService.FONT_SIZE_COOKIE,
      size,
    );
  }

  loadFontFamily(): FontFamily {
    const fromCookie = readPrefCookie(
      this.cookies,
      ThemePersistenceService.FONT_FAMILY_COOKIE,
    );
    return fromCookie && isFontFamily(fromCookie) ? fromCookie : 'system';
  }

  saveFontFamily(family: FontFamily): void {
    writePrefCookie(
      this.cookies,
      ThemePersistenceService.FONT_FAMILY_COOKIE,
      family,
    );
  }

  loadCustomFontSizePx(): number {
    return parseCustomFontPx(
      readPrefCookie(this.cookies, ThemePersistenceService.FONT_SIZE_PX_COOKIE),
    );
  }

  saveCustomFontSizePx(px: number): void {
    writePrefCookie(
      this.cookies,
      ThemePersistenceService.FONT_SIZE_PX_COOKIE,
      String(px),
    );
  }

  isPresetSize(value: string): value is FontSize {
    return isFontSizePreset(value);
  }
}
