import {
  Component,
  input,
  output,
  signal,
  effect,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideX,
  LucideSettings,
  LucidePalette,
  LucideBot,
  LucideMic,
  LucideLanguages,
} from '@lucide/angular';
import { Language } from '@core/services/language.service';
import { I18nService } from '@core/services/i18n.service';
import { SettingsTabGeneralComponent } from './settings-tab-general.component';
import { SettingsTabAiComponent } from './settings-tab-ai.component';
import { SettingsTabVoicesComponent } from './settings-tab-voices.component';
import { SettingsTabLanguageComponent } from './settings-tab-language.component';

export type SettingsTab = 'general' | 'ai_model' | 'voices' | 'language';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideX,
    LucideSettings,
    LucidePalette,
    LucideBot,
    LucideMic,
    LucideLanguages,
    SettingsTabGeneralComponent,
    SettingsTabAiComponent,
    SettingsTabVoicesComponent,
    SettingsTabLanguageComponent,
  ],
  template: `
    <dialog #dialogEl class="modal">
      <div
        class="modal-box flex h-[85vh] max-w-5xl overflow-hidden border border-base-300 bg-base-200 p-0 text-base-content shadow-2xl"
      >
        <!-- Left: Tab Navigation -->
        <div
          class="flex w-48 shrink-0 flex-col border-r border-base-300 bg-base-300/50"
        >
          <div class="flex items-center gap-2 border-b border-base-300 p-4">
            <svg lucideSettings class="h-5 w-5 text-primary"></svg>
            <h3 class="text-sm font-bold">{{ t('settings.title') }}</h3>
          </div>

          <div class="flex flex-1 flex-col gap-1 p-2">
            <button
              type="button"
              class="btn justify-start gap-2 normal-case btn-sm"
              [class.btn-primary]="activeTab() === 'general'"
              [class.btn-ghost]="activeTab() !== 'general'"
              (click)="activeTab.set('general')"
            >
              <svg lucidePalette class="h-4 w-4"></svg>
              {{ t('settings.general') }}
            </button>
            <button
              type="button"
              class="btn justify-start gap-2 normal-case btn-sm"
              [class.btn-primary]="activeTab() === 'ai_model'"
              [class.btn-ghost]="activeTab() !== 'ai_model'"
              (click)="activeTab.set('ai_model')"
            >
              <svg lucideBot class="h-4 w-4"></svg>
              {{ t('settings.ai_model') }}
            </button>
            <button
              type="button"
              class="btn justify-start gap-2 normal-case btn-sm"
              [class.btn-primary]="activeTab() === 'voices'"
              [class.btn-ghost]="activeTab() !== 'voices'"
              (click)="activeTab.set('voices')"
            >
              <svg lucideMic class="h-4 w-4"></svg>
              {{ t('settings.voices') }}
            </button>
            <button
              type="button"
              class="btn justify-start gap-2 normal-case btn-sm"
              [class.btn-primary]="activeTab() === 'language'"
              [class.btn-ghost]="activeTab() !== 'language'"
              (click)="activeTab.set('language')"
            >
              <svg lucideLanguages class="h-4 w-4"></svg>
              {{ t('settings.language') }}
            </button>
          </div>
        </div>

        <!-- Right: Tab Content -->
        <div class="flex min-w-0 flex-1 flex-col">
          <!-- Close button header -->
          <div class="flex shrink-0 justify-end border-b border-base-300 p-3">
            <button
              type="button"
              class="btn btn-circle btn-ghost btn-sm"
              (click)="close()"
              aria-label="Close"
            >
              <svg lucideX class="h-4 w-4"></svg>
            </button>
          </div>

          <!-- Scrollable content -->
          <div class="flex-1 overflow-y-auto p-6">
            @if (activeTab() === 'general') {
              <app-settings-tab-general />
            } @else if (activeTab() === 'ai_model') {
              <app-settings-tab-ai />
            } @else if (activeTab() === 'voices') {
              <app-settings-tab-voices
                (voiceChange)="voiceChange.emit($event)"
              />
            } @else if (activeTab() === 'language') {
              <app-settings-tab-language
                [languages]="languages()"
                (languageChange)="languageChange.emit($event)"
              />
            }
          </div>
        </div>
      </div>

      <form method="dialog" class="modal-backdrop backdrop-blur-sm">
        <button type="button" (click)="close()">close</button>
      </form>
    </dialog>
  `,
})
export class SettingsDialogComponent {
  private readonly i18n = inject(I18nService);

  readonly dialogEl = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');

  readonly isOpen = input<boolean>(false);
  readonly languages = input<Language[]>([]);
  readonly selectedLanguage = input<string>('en');
  readonly selectedVoiceName = input<string>('');
  readonly initialTab = input<SettingsTab>('general');

  readonly closed = output<void>();
  readonly languageChange = output<string>();
  readonly voiceChange = output<string>();

  readonly activeTab = signal<SettingsTab>('general');

  constructor() {
    effect(() => {
      const dialog = this.dialogEl()?.nativeElement;
      if (!dialog) return;
      if (this.isOpen()) {
        this.activeTab.set(this.initialTab());
        if (!dialog.open) dialog.showModal();
      } else {
        if (dialog.open) dialog.close();
      }
    });
  }

  t(key: string): string {
    return this.i18n.t()(key);
  }

  close(): void {
    const dialog = this.dialogEl()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
    this.closed.emit();
  }
}
