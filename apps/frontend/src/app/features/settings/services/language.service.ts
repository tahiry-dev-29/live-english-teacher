import { Injectable, signal } from '@angular/core';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

const STORAGE_KEY = 'learning_language';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  readonly selectedLanguageCode = signal<string>(this.loadLanguage());

  readonly languages: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  ];

  setLanguage(code: string): void {
    this.selectedLanguageCode.set(code);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, code);
      }
    } catch {
      // ignore
    }
  }

  private loadLanguage(): string {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(STORAGE_KEY) || 'en';
      }
    } catch {
      // ignore
    }
    return 'en';
  }
}
