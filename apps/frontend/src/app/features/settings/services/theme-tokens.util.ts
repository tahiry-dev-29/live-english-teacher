/** Pure theme tokens + mapping helpers (plan-001 T95 split, no Angular deps). */

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

export const DEFAULT_FONT_CSS =
  "system-ui, -apple-system, 'Segoe UI', sans-serif";

export function fontCssFor(family: FontFamily): string {
  return FONT_FAMILIES.find((f) => f.id === family)?.css ?? DEFAULT_FONT_CSS;
}

export function fontLabelFor(family: FontFamily): string {
  return FONT_FAMILIES.find((f) => f.id === family)?.label ?? 'System UI';
}

/** Map a FontSize preset (+ custom px) to a CSS font-size value. */
export function fontSizeToPx(size: FontSize, customPx: number): string {
  const sizeMap: Record<FontSize, string> = {
    small: '14px',
    medium: '16px',
    large: '18px',
    custom: `${customPx}px`,
  };
  return sizeMap[size] ?? '16px';
}

/** Resolve a Theme to a concrete `data-theme` value. */
export function resolveThemeName(theme: Theme, prefersDark: boolean): string {
  if (theme === 'system') {
    return prefersDark ? 'app-dark' : 'app-light';
  }
  return theme === 'dark' ? 'app-dark' : 'app-light';
}

/** Clamp a custom font size to the supported px range. */
export function clampFontPx(px: number): number {
  return Math.min(32, Math.max(10, px));
}

/** Parse the persisted custom px cookie value (fallback 16). */
export function parseCustomFontPx(raw: string | null | undefined): number {
  const n = parseInt(raw ?? '', 10);
  return isNaN(n) ? 16 : clampFontPx(n);
}

export function isFontFamily(value: string): value is FontFamily {
  return (
    value === 'system' ||
    value === 'serif' ||
    value === 'mono' ||
    value === 'inter' ||
    value === 'georgia' ||
    value === 'courier'
  );
}

export function isTheme(value: string): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function isFontSizePreset(value: string): value is FontSize {
  return (
    value === 'small' ||
    value === 'medium' ||
    value === 'large' ||
    value === 'custom'
  );
}
