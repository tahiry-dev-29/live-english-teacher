import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSun, LucideMoon, LucideMonitor } from '@lucide/angular';
import {
  ThemeService,
  FONT_FAMILIES,
  FontSize,
} from '@core/services/theme.service';
import { I18nService, AppLanguage } from '@core/services/i18n.service';
import {
  AppSelectComponent,
  SelectOption,
} from '@core/components/ui/select/select.component';

@Component({
  selector: 'app-settings-tab-general',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideSun,
    LucideMoon,
    LucideMonitor,
    AppSelectComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- 1. Theme Selection (Mini UI cards) -->
      <div class="space-y-2">
        <p
          class="text-xs font-medium tracking-wider text-base-content/50 uppercase"
        >
          {{ t('general.theme') }}
        </p>
        <div class="grid grid-cols-3 gap-3">
          <!-- Dark Card (Halloween theme) -->
          <button
            type="button"
            class="group relative flex flex-col items-start gap-2.5 rounded-xl border p-2 text-left transition-all hover:border-primary/50"
            [class.border-primary]="themeService.theme() === 'dark'"
            [class.bg-primary/5]="themeService.theme() === 'dark'"
            [class.border-base-300]="themeService.theme() !== 'dark'"
            (click)="themeService.setTheme('dark')"
          >
            <!-- Realistic mini app mockup: Dark theme (indigo-blue on dark base) -->
            <div
              data-theme="app-dark"
              class="w-full rounded-lg border border-base-content/10 bg-base-100 p-2 shadow-xs"
            >
              <!-- Window top bar -->
              <div
                class="mb-1.5 flex items-center justify-between border-b border-base-content/10 pb-1.5"
              >
                <div class="flex items-center gap-1">
                  <div class="h-1.5 w-1.5 rounded-full bg-error"></div>
                  <div class="h-1.5 w-1.5 rounded-full bg-warning"></div>
                  <div class="h-1.5 w-1.5 rounded-full bg-success"></div>
                </div>
                <div class="h-1.5 w-8 rounded-full bg-base-content/20"></div>
              </div>
              <!-- Mini app layout: sidebar + content area -->
              <div class="flex gap-1.5">
                <!-- Mini sidebar -->
                <div class="w-1/4 space-y-1 rounded bg-base-200 p-1">
                  <div class="h-1.5 w-full rounded bg-primary"></div>
                  <div class="h-1 w-3/4 rounded bg-base-content/20"></div>
                  <div class="h-1 w-1/2 rounded bg-base-content/20"></div>
                </div>
                <!-- Mini chat body -->
                <div class="flex-1 space-y-1 rounded bg-base-200/50 p-1">
                  <div class="flex justify-start">
                    <div class="h-2 w-3/5 rounded bg-base-300"></div>
                  </div>
                  <div class="flex justify-end">
                    <div class="h-2 w-4/5 rounded bg-primary"></div>
                  </div>
                  <div class="flex justify-start">
                    <div class="h-2 w-1/2 rounded bg-base-300"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card footer -->
            <div class="flex w-full items-center justify-between px-0.5">
              <div class="flex items-center gap-1.5">
                <svg lucideMoon class="h-3.5 w-3.5 text-base-content/70"></svg>
                <span class="text-xs font-medium">{{
                  t('general.theme.dark')
                }}</span>
              </div>
              @if (themeService.theme() === 'dark') {
                <span class="badge badge-xs badge-primary">Active</span>
              }
            </div>
          </button>

          <!-- Light Card (Emerald theme) -->
          <button
            type="button"
            class="group relative flex flex-col items-start gap-2.5 rounded-xl border p-2 text-left transition-all hover:border-primary/50"
            [class.border-primary]="themeService.theme() === 'light'"
            [class.bg-primary/5]="themeService.theme() === 'light'"
            [class.border-base-300]="themeService.theme() !== 'light'"
            (click)="themeService.setTheme('light')"
          >
            <!-- Realistic mini app mockup: Light theme (indigo-blue on light base) -->
            <div
              data-theme="app-light"
              class="w-full rounded-lg border border-base-content/10 bg-base-100 p-2 shadow-xs"
            >
              <!-- Window top bar -->
              <div
                class="mb-1.5 flex items-center justify-between border-b border-base-content/10 pb-1.5"
              >
                <div class="flex items-center gap-1">
                  <div class="h-1.5 w-1.5 rounded-full bg-error"></div>
                  <div class="h-1.5 w-1.5 rounded-full bg-warning"></div>
                  <div class="h-1.5 w-1.5 rounded-full bg-success"></div>
                </div>
                <div class="h-1.5 w-8 rounded-full bg-base-content/20"></div>
              </div>
              <!-- Mini app layout: sidebar + content area -->
              <div class="flex gap-1.5">
                <!-- Mini sidebar -->
                <div class="w-1/4 space-y-1 rounded bg-base-200 p-1">
                  <div class="h-1.5 w-full rounded bg-primary"></div>
                  <div class="h-1 w-3/4 rounded bg-base-content/20"></div>
                  <div class="h-1 w-1/2 rounded bg-base-content/20"></div>
                </div>
                <!-- Mini chat body -->
                <div class="flex-1 space-y-1 rounded bg-base-200/50 p-1">
                  <div class="flex justify-start">
                    <div class="h-2 w-3/5 rounded bg-base-300"></div>
                  </div>
                  <div class="flex justify-end">
                    <div class="h-2 w-4/5 rounded bg-primary"></div>
                  </div>
                  <div class="flex justify-start">
                    <div class="h-2 w-1/2 rounded bg-base-300"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card footer -->
            <div class="flex w-full items-center justify-between px-0.5">
              <div class="flex items-center gap-1.5">
                <svg lucideSun class="h-3.5 w-3.5 text-base-content/70"></svg>
                <span class="text-xs font-medium">{{
                  t('general.theme.light')
                }}</span>
              </div>
              @if (themeService.theme() === 'light') {
                <span class="badge badge-xs badge-primary">Active</span>
              }
            </div>
          </button>

          <!-- System Card -->
          <button
            type="button"
            class="group relative flex flex-col items-start gap-2.5 rounded-xl border p-2 text-left transition-all hover:border-primary/50"
            [class.border-primary]="themeService.theme() === 'system'"
            [class.bg-primary/5]="themeService.theme() === 'system'"
            [class.border-base-300]="themeService.theme() !== 'system'"
            (click)="themeService.setTheme('system')"
          >
            <!-- Realistic mini app mockup: Split Dark & Light (same indigo-blue brand) -->
            <div
              class="flex w-full overflow-hidden rounded-lg border border-base-content/10 shadow-xs"
            >
              <!-- Left: app-dark half -->
              <div data-theme="app-dark" class="w-1/2 bg-base-100 p-2">
                <div
                  class="mb-1.5 flex items-center gap-1 border-b border-base-content/10 pb-1.5"
                >
                  <div class="h-1.5 w-1.5 rounded-full bg-error"></div>
                  <div class="h-1.5 w-1.5 rounded-full bg-warning"></div>
                </div>
                <div class="space-y-1">
                  <div class="h-1.5 w-full rounded bg-primary"></div>
                  <div class="h-2 w-4/5 rounded bg-base-300"></div>
                  <div class="h-2 w-3/5 rounded bg-primary"></div>
                </div>
              </div>

              <!-- Right: app-light half -->
              <div
                data-theme="app-light"
                class="w-1/2 border-l border-base-content/10 bg-base-100 p-2"
              >
                <div
                  class="mb-1.5 flex items-center justify-end gap-1 border-b border-base-content/10 pb-1.5"
                >
                  <div class="h-1.5 w-1.5 rounded-full bg-success"></div>
                </div>
                <div class="space-y-1">
                  <div class="h-1.5 w-full rounded bg-primary"></div>
                  <div class="h-2 w-4/5 rounded bg-base-300"></div>
                  <div class="h-2 w-3/5 rounded bg-primary"></div>
                </div>
              </div>
            </div>

            <!-- Card footer -->
            <div class="flex w-full items-center justify-between px-0.5">
              <div class="flex items-center gap-1.5">
                <svg
                  lucideMonitor
                  class="h-3.5 w-3.5 text-base-content/70"
                ></svg>
                <span class="text-xs font-medium">{{
                  t('general.theme.system')
                }}</span>
              </div>
              @if (themeService.theme() === 'system') {
                <span class="badge badge-xs badge-primary">Active</span>
              }
            </div>
          </button>
        </div>
      </div>

      <!-- 2. App Language (Mini UI cards) -->
      <div class="space-y-2">
        <p
          class="text-xs font-medium tracking-wider text-base-content/50 uppercase"
        >
          {{ t('general.app_language') }}
        </p>
        <div class="grid grid-cols-3 gap-2.5">
          @for (langItem of availableLangs; track langItem.code) {
            <button
              type="button"
              class="flex flex-col items-start justify-between rounded-xl border p-2.5 text-left transition-all"
              [class.border-primary]="i18n.lang() === langItem.code"
              [class.bg-primary/5]="i18n.lang() === langItem.code"
              [class.border-base-300]="i18n.lang() !== langItem.code"
              (click)="i18n.setLang(langItem.code)"
            >
              <div class="flex w-full items-center justify-between">
                <span class="text-xs font-bold tracking-widest text-primary">{{
                  langItem.iso
                }}</span>
                @if (i18n.lang() === langItem.code) {
                  <span class="badge badge-xs badge-primary">Active</span>
                }
              </div>
              <div class="mt-2">
                <p class="text-xs font-medium text-base-content">
                  {{ langItem.name }}
                </p>
                <p class="text-[10px] text-base-content/50">
                  {{ langItem.nativeName }}
                </p>
              </div>
            </button>
          }
        </div>
      </div>

      <!-- 3. Typography -->
      <div class="space-y-3">
        <p
          class="text-xs font-medium tracking-wider text-base-content/50 uppercase"
        >
          Typography
        </p>

        <!-- Row: Font Family + Font Size -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <!-- Font Family -->
          <div class="space-y-1.5">
            <app-select
              selectId="settings-font-family"
              label="Font Family"
              [options]="fontFamilyOptions"
              [ngModel]="themeService.fontFamily()"
              (ngModelChange)="themeService.setFontFamily($event)"
              size="sm"
              color="primary"
            />
          </div>

          <!-- Font Size: unified preset + custom slider -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span
                id="settings-font-size-label"
                class="text-xs font-medium text-base-content/60"
                >Font Size</span
              >
              <span class="font-mono text-xs text-base-content/40">{{
                activeSizeDisplay()
              }}</span>
            </div>

            <!-- Segmented preset row (Small / Medium / Large / Custom) -->
            <div
              class="join w-full"
              role="radiogroup"
              aria-labelledby="settings-font-size-label"
            >
              @for (preset of fontPresets; track preset.id) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="themeService.fontSize() === preset.id"
                  (click)="themeService.setFontSize(preset.id)"
                  class="btn join-item flex-1 transition-all btn-xs"
                  [class.btn-primary]="themeService.fontSize() === preset.id"
                  [class.btn-ghost]="themeService.fontSize() !== preset.id"
                >
                  {{ preset.label }}
                </button>
              }
            </div>

            <!-- Custom slider — inline, shown only when Custom is active -->
            @if (themeService.fontSize() === 'custom') {
              <div class="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="28"
                  step="1"
                  class="range flex-1 range-primary range-xs"
                  [ngModel]="themeService.customFontSizePx()"
                  (ngModelChange)="onCustomSizeChange($event)"
                />
                <input
                  type="number"
                  min="10"
                  max="28"
                  class="input w-14 border-base-300 text-center font-mono input-xs"
                  [ngModel]="themeService.customFontSizePx()"
                  (ngModelChange)="onCustomSizeChange($event)"
                />
              </div>
            }
          </div>
        </div>

        <!-- Live Preview -->
        <div class="rounded-xl border border-base-300 bg-base-100/60 px-4 py-3">
          <div class="mb-2 flex items-center justify-between">
            <span
              class="text-[10px] font-medium tracking-widest text-base-content/40 uppercase"
              >Preview</span
            >
            <span class="font-mono text-[10px] text-base-content/40">
              {{ currentFontFamilyLabel() }} · {{ activeSizeDisplay() }}
            </span>
          </div>
          <div
            class="space-y-1 transition-all"
            [style.fontFamily]="currentFontCss()"
            [style.fontSize]="activeSizePx()"
          >
            <p class="leading-snug font-semibold text-base-content">
              The quick brown fox jumps over the lazy dog.
            </p>
            <p class="text-base-content/70">
              Practice speaking English every day with live feedback.
            </p>
            <p class="font-mono text-[11px] text-base-content/50">
              pronunciation · fluency · grammar · comprehension
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsTabGeneralComponent {
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

  readonly fontFamilies = FONT_FAMILIES;

  /** FONT_FAMILIES mapped to the SelectOption shape expected by app-select. */
  readonly fontFamilyOptions: SelectOption[] = FONT_FAMILIES.map((f) => ({
    value: f.id,
    label: f.label,
  }));

  readonly fontPresets: { id: FontSize; label: string }[] = [
    { id: 'small', label: 'Small' },
    { id: 'medium', label: 'Medium' },
    { id: 'large', label: 'Large' },
    { id: 'custom', label: 'Custom' },
  ];

  readonly availableLangs: {
    code: AppLanguage;
    iso: string;
    name: string;
    nativeName: string;
  }[] = [
    { code: 'en', iso: 'EN', name: 'English', nativeName: 'English (US/UK)' },
    { code: 'fr', iso: 'FR', name: 'Français', nativeName: 'Français' },
    { code: 'es', iso: 'ES', name: 'Español', nativeName: 'Español' },
  ];

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

  currentFontFamilyLabel(): string {
    const f = this.themeService.fontFamily();
    return FONT_FAMILIES.find((item) => item.id === f)?.label ?? 'System UI';
  }

  currentFontCss(): string {
    const f = this.themeService.fontFamily();
    return FONT_FAMILIES.find((item) => item.id === f)?.css ?? 'inherit';
  }

  activeSizeDisplay(): string {
    const s = this.themeService.fontSize();
    if (s === 'custom') return `${this.themeService.customFontSizePx()}px`;
    if (s === 'small') return '14px';
    if (s === 'medium') return '16px';
    if (s === 'large') return '18px';
    return '16px';
  }

  activeSizePx(): string {
    return this.activeSizeDisplay();
  }
}
