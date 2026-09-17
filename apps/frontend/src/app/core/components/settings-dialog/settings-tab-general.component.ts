import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideSun, LucideMoon, LucideMonitor } from '@lucide/angular';
import { ThemeService } from '@core/services/theme.service';
import { I18nService } from '@core/services/i18n.service';

@Component({
  selector: 'app-settings-tab-general',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideSun, LucideMoon, LucideMonitor],
  template: `
    <div class="space-y-6">
      <!-- Theme -->
      <fieldset class="fieldset">
        <legend class="fieldset-legend text-sm font-semibold">
          {{ t('general.theme') }}
        </legend>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn flex-1 gap-2 btn-outline btn-sm"
            [class.btn-primary]="themeService.theme() === 'dark'"
            (click)="themeService.setTheme('dark')"
          >
            <svg lucideMoon class="h-4 w-4"></svg>
            {{ t('general.theme.dark') }}
          </button>
          <button
            type="button"
            class="btn flex-1 gap-2 btn-outline btn-sm"
            [class.btn-primary]="themeService.theme() === 'light'"
            (click)="themeService.setTheme('light')"
          >
            <svg lucideSun class="h-4 w-4"></svg>
            {{ t('general.theme.light') }}
          </button>
          <button
            type="button"
            class="btn flex-1 gap-2 btn-outline btn-sm"
            [class.btn-primary]="themeService.theme() === 'system'"
            (click)="themeService.setTheme('system')"
          >
            <svg lucideMonitor class="h-4 w-4"></svg>
            {{ t('general.theme.system') }}
          </button>
        </div>
      </fieldset>

      <!-- Font Size -->
      <fieldset class="fieldset">
        <legend class="fieldset-legend text-sm font-semibold">
          {{ t('general.font_size') }}
        </legend>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn flex-1 btn-outline btn-sm"
            [class.btn-primary]="themeService.fontSize() === 'small'"
            (click)="themeService.setFontSize('small')"
          >
            <span class="text-xs">{{ t('general.font.small') }}</span>
          </button>
          <button
            type="button"
            class="btn flex-1 btn-outline btn-sm"
            [class.btn-primary]="themeService.fontSize() === 'medium'"
            (click)="themeService.setFontSize('medium')"
          >
            <span class="text-sm">{{ t('general.font.medium') }}</span>
          </button>
          <button
            type="button"
            class="btn flex-1 btn-outline btn-sm"
            [class.btn-primary]="themeService.fontSize() === 'large'"
            (click)="themeService.setFontSize('large')"
          >
            <span class="text-lg">{{ t('general.font.large') }}</span>
          </button>
        </div>
      </fieldset>

      <!-- App Language -->
      <fieldset class="fieldset">
        <legend class="fieldset-legend text-sm font-semibold">
          {{ t('general.app_language') }}
        </legend>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn flex-1 gap-2 btn-outline btn-sm"
            [class.btn-primary]="i18n.lang() === 'en'"
            (click)="i18n.setLang('en')"
          >
            🇬🇧 English
          </button>
          <button
            type="button"
            class="btn flex-1 gap-2 btn-outline btn-sm"
            [class.btn-primary]="i18n.lang() === 'fr'"
            (click)="i18n.setLang('fr')"
          >
            🇫🇷 Français
          </button>
          <button
            type="button"
            class="btn flex-1 gap-2 btn-outline btn-sm"
            [class.btn-primary]="i18n.lang() === 'es'"
            (click)="i18n.setLang('es')"
          >
            🇪🇸 Español
          </button>
        </div>
      </fieldset>
    </div>
  `,
})
export class SettingsTabGeneralComponent {
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

  t(key: string): string {
    return this.i18n.t()(key);
  }
}
