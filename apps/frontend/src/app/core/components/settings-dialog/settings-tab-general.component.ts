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
      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
          {{ t('general.theme') }}
        </p>
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
      </div>

      <!-- Font Size -->
      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
          {{ t('general.font_size') }}
        </p>
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
      </div>

      <!-- App Language -->
      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
          {{ t('general.app_language') }}
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn flex-1 gap-1.5 btn-outline btn-sm normal-case"
            [class.btn-primary]="i18n.lang() === 'en'"
            (click)="i18n.setLang('en')"
          >
            <span class="text-xs font-bold tracking-wide">EN</span>
            <span>English</span>
          </button>
          <button
            type="button"
            class="btn flex-1 gap-1.5 btn-outline btn-sm normal-case"
            [class.btn-primary]="i18n.lang() === 'fr'"
            (click)="i18n.setLang('fr')"
          >
            <span class="text-xs font-bold tracking-wide">FR</span>
            <span>Francais</span>
          </button>
          <button
            type="button"
            class="btn flex-1 gap-1.5 btn-outline btn-sm normal-case"
            [class.btn-primary]="i18n.lang() === 'es'"
            (click)="i18n.setLang('es')"
          >
            <span class="text-xs font-bold tracking-wide">ES</span>
            <span>Espanol</span>
          </button>
        </div>
      </div>
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
