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
      <div class="space-y-1">
        <p
          class="text-xs font-medium tracking-wider text-base-content/50 uppercase"
        >
          {{ t('language.learning') }}
        </p>
        <p class="text-xs text-base-content/60">
          {{ t('language.learning_hint') }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        @for (lang of languagesList; track lang.code) {
          <button
            type="button"
            class="flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all"
            [class.border-primary]="
              languageService.selectedLanguageCode() === lang.code
            "
            [class.bg-primary/5]="
              languageService.selectedLanguageCode() === lang.code
            "
            [class.border-base-300]="
              languageService.selectedLanguageCode() !== lang.code
            "
            [class.hover:border-base-content/20]="
              languageService.selectedLanguageCode() !== lang.code
            "
            [class.hover:bg-base-200/40]="
              languageService.selectedLanguageCode() !== lang.code
            "
            (click)="onSelectLanguage(lang.code)"
          >
            <div class="flex w-full items-center justify-between">
              <span
                class="font-mono text-xs font-bold tracking-wider text-primary uppercase"
              >
                {{ lang.code }}
              </span>
              @if (languageService.selectedLanguageCode() === lang.code) {
                <span class="badge badge-xs badge-primary">Active</span>
              }
            </div>
            <div class="mt-2.5">
              <p class="text-sm font-semibold text-base-content">
                {{ lang.name }}
              </p>
              <p class="text-[11px] text-base-content/50">Audio & Lessons</p>
            </div>
          </button>
        }
      </div>
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
