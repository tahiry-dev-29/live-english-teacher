import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { LucideSun, LucideMoon, LucideMonitor } from '@lucide/angular';
import { ThemeService } from './services/theme.service';
import { I18nService } from './services/i18n.service';

/** Theme-selection cards of the general settings tab. */
@Component({
  selector: 'app-settings-appearance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideSun, LucideMoon, LucideMonitor],
  templateUrl: './settings-appearance.component.html',
})
export class SettingsAppearanceComponent {
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

  t(key: string): string {
    return this.i18n.t()(key);
  }
}
