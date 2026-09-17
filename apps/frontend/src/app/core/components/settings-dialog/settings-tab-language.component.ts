import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService, Language } from '@core/services/language.service';
import { I18nService } from '@core/services/i18n.service';

@Component({
  selector: 'app-settings-tab-language',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend text-sm font-semibold">
          {{ t('language.learning') }}
        </legend>
        <p class="mb-3 text-xs text-base-content/50">
          {{ t('language.learning_hint') }}
        </p>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          @for (lang of languagesList; track lang.code) {
            <button
              type="button"
              class="btn h-auto justify-start gap-2 btn-outline px-3 py-2.5"
              [class.btn-primary]="
                languageService.selectedLanguageCode() === lang.code
              "
              (click)="onSelectLanguage(lang.code)"
            >
              <span class="text-xl leading-none">{{ lang.flag }}</span>
              <span class="text-xs font-medium">{{ lang.name }}</span>
            </button>
          }
        </div>
      </fieldset>
    </div>
  `,
})
export class SettingsTabLanguageComponent {
  readonly languageService = inject(LanguageService);
  readonly i18n = inject(I18nService);

  readonly languages = input<Language[]>([]);
  readonly languageChange = output<string>();

  t(key: string): string {
    return this.i18n.t()(key);
  }

  get languagesList(): Language[] {
    const langs = this.languages();
    return langs.length > 0 ? langs : this.languageService.languages;
  }

  onSelectLanguage(code: string): void {
    this.languageService.setLanguage(code);
    this.languageChange.emit(code);
  }
}
