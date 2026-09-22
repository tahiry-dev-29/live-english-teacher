import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
} from '@angular/core';
import { ThemeService } from './services/theme.service';
import { I18nService } from './services/i18n.service';
import {
  FONT_FAMILIES,
  fontCssFor,
  fontLabelFor,
  type FontFamily,
} from './services/theme-tokens.util';
import {
  AVAILABLE_APP_LANGS,
  FONT_PRESETS,
  fontFamilyOptionsFor,
  fontSizeDisplay,
} from './settings-general.util';
import {
  AppSelectComponent,
  type SelectOption,
} from '@core/components/ui/select/select.component';
import { SettingsProfileFormComponent } from './settings-profile-form.component';
import { SettingsAppearanceComponent } from './settings-appearance.component';

@Component({
  selector: 'app-settings-tab-general',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppSelectComponent,
    SettingsProfileFormComponent,
    SettingsAppearanceComponent,
  ],
  templateUrl: './settings-tab-general.component.html',
})
export class SettingsTabGeneralComponent {
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

  /** FONT_FAMILIES mapped to the SelectOption shape expected by app-select. */
  readonly fontFamilyOptions: SelectOption[] =
    fontFamilyOptionsFor(FONT_FAMILIES);

  readonly fontPresets = FONT_PRESETS;
  readonly availableLangs = AVAILABLE_APP_LANGS;

  readonly activeSizeDisplay = computed(() =>
    fontSizeDisplay(
      this.themeService.fontSize(),
      this.themeService.customFontSizePx(),
    ),
  );
  readonly currentFontFamilyLabel = computed(() =>
    fontLabelFor(this.themeService.fontFamily()),
  );
  readonly currentFontCss = computed(() =>
    fontCssFor(this.themeService.fontFamily()),
  );

  t(key: string): string {
    return this.i18n.t()(key);
  }

  onCustomSizeChange(val: number | string): void {
    const n = typeof val === 'string' ? parseInt(val, 10) : val;
    if (!isNaN(n)) {
      this.themeService.setCustomFontSizePx(n);
      this.themeService.setFontSize('custom');
    }
  }

  onFontFamilyChange(val: string): void {
    this.themeService.setFontFamily(val as FontFamily);
  }
}
