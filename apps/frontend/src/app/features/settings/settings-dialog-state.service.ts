import { Injectable, signal } from '@angular/core';

export type SettingsTab =
  'general' | 'ai_model' | 'voices' | 'language' | 'memory' | 'tags';

export interface SettingsTabMeta {
  id: SettingsTab;
  /** i18n key for the label, or null when the title is a hardcoded string. */
  titleKey: string | null;
  fallbackTitle?: string;
}

/** Tab registry (plan-001 T95 split): drives dialog nav + header title. */
export const SETTINGS_TABS: SettingsTabMeta[] = [
  { id: 'general', titleKey: 'settings.general' },
  { id: 'ai_model', titleKey: 'settings.ai_model' },
  { id: 'voices', titleKey: 'settings.voices' },
  { id: 'language', titleKey: 'settings.language' },
  { id: 'memory', titleKey: null, fallbackTitle: 'Memory' },
  { id: 'tags', titleKey: null, fallbackTitle: 'Skill tags' },
];

/** Active-tab state for the settings dialog (openTab = single writer). */
@Injectable({
  providedIn: 'root',
})
export class SettingsDialogStateService {
  readonly activeTab = signal<SettingsTab>('general');

  openTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }
}
