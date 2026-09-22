import type { SelectOption } from '@core/components/ui/select/select.component';
import type { AppLanguage } from './services/i18n.service';
import type { FontSize } from './services/theme-tokens.util';

export interface AppLangOption {
  code: AppLanguage;
  iso: string;
  name: string;
  nativeName: string;
}

export const AVAILABLE_APP_LANGS: AppLangOption[] = [
  { code: 'en', iso: 'EN', name: 'English', nativeName: 'English (US/UK)' },
  { code: 'fr', iso: 'FR', name: 'Français', nativeName: 'Français' },
  { code: 'es', iso: 'ES', name: 'Español', nativeName: 'Español' },
];

export interface FontPreset {
  id: FontSize;
  label: string;
}

export const FONT_PRESETS: FontPreset[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
  { id: 'custom', label: 'Custom' },
];

/** FONT_FAMILIES mapped to the SelectOption shape expected by app-select. */
export function fontFamilyOptionsFor(
  families: { id: string; label: string }[],
): SelectOption[] {
  return families.map((f) => ({ value: f.id, label: f.label }));
}

/** Human-readable font-size display (e.g. '14px', '16px', '22px'). */
export function fontSizeDisplay(size: FontSize, customPx: number): string {
  if (size === 'custom') return `${customPx}px`;
  if (size === 'small') return '14px';
  if (size === 'large') return '18px';
  return '16px';
}
