import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private static readonly STORAGE_KEY = 'app_theme';

  readonly theme = signal<Theme>(this.load());
  readonly resolvedTheme = signal<string>('halloween');

  constructor() {
    this.applyTheme(this.theme());

    effect(() => {
      const t = this.theme();
      localStorage.setItem(ThemeService.STORAGE_KEY, t);
      this.applyTheme(t);
    });

    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.theme() === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;

    let resolved: string;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'halloween' : 'emerald';
    } else {
      resolved = theme === 'dark' ? 'halloween' : 'emerald';
    }

    document.documentElement.setAttribute('data-theme', resolved);
    this.resolvedTheme.set(resolved);
  }

  private load(): Theme {
    try {
      return (localStorage.getItem(ThemeService.STORAGE_KEY) as Theme) || 'dark';
    } catch {
      return 'dark';
    }
  }
}
