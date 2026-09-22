import {
  Component,
  input,
  output,
  computed,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
  inject,
  effect,
} from '@angular/core';
import {
  LucideX,
  LucideSettings,
  LucidePalette,
  LucideBot,
  LucideMic,
  LucideLanguages,
  LucideBrain,
  LucideHash,
} from '@lucide/angular';
import { Language } from '@features/settings/services/language.service';
import { I18nService } from '@features/settings/services/i18n.service';
import { SettingsTabGeneralComponent } from './settings-tab-general.component';
import { SettingsTabAiComponent } from './settings-tab-ai.component';
import { SettingsTabVoicesComponent } from './settings-tab-voices.component';
import { SettingsTabLanguageComponent } from './settings-tab-language.component';
import { SettingsTabMemoryComponent } from './settings-tab-memory.component';
import { SettingsTabTagsComponent } from './settings-tab-tags.component';
import {
  SETTINGS_TABS,
  SettingsDialogStateService,
  type SettingsTab,
} from './settings-dialog-state.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideX,
    LucideSettings,
    LucidePalette,
    LucideBot,
    LucideMic,
    LucideLanguages,
    LucideBrain,
    LucideHash,
    SettingsTabGeneralComponent,
    SettingsTabAiComponent,
    SettingsTabVoicesComponent,
    SettingsTabLanguageComponent,
    SettingsTabMemoryComponent,
    SettingsTabTagsComponent,
  ],
  templateUrl: './settings-dialog-component.html',
})
export class SettingsDialogComponent {
  private readonly i18n = inject(I18nService);
  private readonly dialogState = inject(SettingsDialogStateService);

  readonly dialogEl = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');

  readonly isOpen = input<boolean>(false);
  readonly languages = input<Language[]>([]);
  readonly selectedLanguage = input<string>('en');
  readonly selectedVoiceName = input<string>('');
  readonly initialTab = input<SettingsTab>('general');

  readonly closed = output<void>();
  readonly languageChange = output<string>();

  readonly activeTab = this.dialogState.activeTab;
  readonly tabs = computed(() =>
    SETTINGS_TABS.map((m) => ({
      id: m.id,
      label: m.titleKey ? this.t(m.titleKey) : (m.fallbackTitle ?? m.id),
    })),
  );
  readonly tabTitle = computed(
    () => this.tabs().find((tab) => tab.id === this.activeTab())?.label ?? '',
  );

  constructor() {
    effect(() => {
      const dialog = this.dialogEl()?.nativeElement;
      if (!dialog) return;
      if (this.isOpen()) {
        this.dialogState.openTab(this.initialTab());
        if (!dialog.open) dialog.showModal();
      } else {
        if (dialog.open) dialog.close();
      }
    });
  }

  t(key: string): string {
    return this.i18n.t()(key);
  }

  openTab(tab: SettingsTab): void {
    this.dialogState.openTab(tab);
  }

  close(): void {
    const dialog = this.dialogEl()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
    this.closed.emit();
  }
}
