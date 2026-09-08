import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({
  providedIn: 'root',
})
export class PwaService {
  readonly canInstall = signal<boolean>(false);
  readonly isInstalled = signal<boolean>(false);
  readonly installPrompt = signal<BeforeInstallPromptEvent | null>(null);

  constructor() {
    this.checkInstallState();
    this.listenForInstallPrompt();
  }

  private checkInstallState(): void {
    if (typeof window === 'undefined') return;

    // Check if already running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    this.isInstalled.set(isStandalone);
  }

  private listenForInstallPrompt(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.installPrompt.set(e as BeforeInstallPromptEvent);
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled.set(true);
      this.canInstall.set(false);
      this.installPrompt.set(null);
    });
  }

  async install(): Promise<boolean> {
    const prompt = this.installPrompt();
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        this.canInstall.set(false);
        this.installPrompt.set(null);
        return true;
      }
    } catch {
      // User dismissed or error
    }
    return false;
  }
}
