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
        class="modal-box flex h-[85vh] max-w-5xl overflow-hidden border border-base-300 bg-base-200 p-0 text-base-content"
      >
        <!-- Left: Tab Navigation -->
        <div
          class="flex w-48 shrink-0 flex-col border-r border-base-300 bg-base-300/30"
        >
          <!-- Sidebar header -->
          <div
            class="flex items-center gap-2 border-b border-base-300 px-4 py-3"
          >
            <svg lucideSettings class="h-4 w-4 text-base-content/50"></svg>
            <h3
              class="text-xs font-semibold tracking-wider text-base-content/60 uppercase"
            >
              {{ t('settings.title') }}
            </h3>
          </div>

          <!-- Nav items: left-border active state -->
          <nav
            class="flex flex-1 flex-col gap-0.5 p-2"
            role="navigation"
            aria-label="Settings sections"
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm normal-case transition-colors"
              [class.border-l-2]="activeTab() === 'general'"
              [class.border-primary]="activeTab() === 'general'"
              [class.text-primary]="activeTab() === 'general'"
              [class.font-medium]="activeTab() === 'general'"
              [class.bg-primary/5]="activeTab() === 'general'"
              [class.text-base-content]="activeTab() !== 'general'"
              (click)="activeTab.set('general')"
            >
              <svg lucidePalette class="h-4 w-4 shrink-0"></svg>
              <span class="truncate">{{ t('settings.general') }}</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm normal-case transition-colors"
              [class.border-l-2]="activeTab() === 'ai_model'"
              [class.border-primary]="activeTab() === 'ai_model'"
              [class.text-primary]="activeTab() === 'ai_model'"
              [class.font-medium]="activeTab() === 'ai_model'"
              [class.bg-primary/5]="activeTab() === 'ai_model'"
              [class.text-base-content]="activeTab() !== 'ai_model'"
              (click)="activeTab.set('ai_model')"
            >
              <svg lucideBot class="h-4 w-4 shrink-0"></svg>
              <span class="truncate">{{ t('settings.ai_model') }}</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm normal-case transition-colors"
              [class.border-l-2]="activeTab() === 'voices'"
              [class.border-primary]="activeTab() === 'voices'"
              [class.text-primary]="activeTab() === 'voices'"
              [class.font-medium]="activeTab() === 'voices'"
              [class.bg-primary/5]="activeTab() === 'voices'"
              [class.text-base-content]="activeTab() !== 'voices'"
              (click)="activeTab.set('voices')"
            >
              <svg lucideMic class="h-4 w-4 shrink-0"></svg>
              <span class="truncate">{{ t('settings.voices') }}</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm normal-case transition-colors"
              [class.border-l-2]="activeTab() === 'language'"
              [class.border-primary]="activeTab() === 'language'"
              [class.text-primary]="activeTab() === 'language'"
              [class.font-medium]="activeTab() === 'language'"
              [class.bg-primary/5]="activeTab() === 'language'"
              [class.text-base-content]="activeTab() !== 'language'"
              (click)="activeTab.set('language')"
            >
              <svg lucideLanguages class="h-4 w-4 shrink-0"></svg>
              <span class="truncate">{{ t('settings.language') }}</span>
            </button>
          </nav>
        </div>

        <!-- Right: Tab Content -->
        <div class="flex min-w-0 flex-1 flex-col">
          <!-- Unified header: active tab title + close in one row -->
          <div
            class="flex shrink-0 items-center justify-between border-b border-base-300 px-6 py-3"
          >
            <h2 class="text-sm font-semibold text-base-content">
              @if (activeTab() === 'general') {
                {{ t('settings.general') }}
              } @else if (activeTab() === 'ai_model') {
                {{ t('settings.ai_model') }}
              } @else if (activeTab() === 'voices') {
                {{ t('settings.voices') }}
              } @else if (activeTab() === 'language') {
                {{ t('settings.language') }}
              }
            </h2>
            <button
              type="button"
              class="btn btn-circle btn-ghost btn-sm"
              (click)="close()"
              aria-label="Close settings"
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
