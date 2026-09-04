import { Injectable, signal, effect } from '@angular/core';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  selectedLanguageCode = signal<string>('en');
  availableVoices = signal<SpeechSynthesisVoice[]>([]);
  selectedVoice = signal<SpeechSynthesisVoice | null>(null);

  readonly languages: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  ];

  constructor() {
    this.loadVoices();
    if (typeof window !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }

    effect(() => {
      const lang = this.selectedLanguageCode();
      this.selectBestVoiceForLanguage(lang);
    });
  }

  setLanguage(code: string) {
    this.selectedLanguageCode.set(code);
  }

  setVoice(voiceName: string) {
    const voice = this.availableVoices().find((v) => v.name === voiceName);
    if (voice) {
      this.selectedVoice.set(voice);
    }
  }

  private voicesRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private emptyPolls = 0;
  private warmupDone = false;

  /** Recharge la liste des voix (utile quand Chromium ne les expose qu'après
   *  le premier événement voiceschanged). */
  reloadVoices(): void {
    this.emptyPolls = 0;
    this.loadVoices();
  }

  private loadVoices(): void {
    if (typeof window === 'undefined') return;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      if (this.voicesRefreshTimer) {
        clearTimeout(this.voicesRefreshTimer);
        this.voicesRefreshTimer = null;
      }
      this.emptyPolls = 0;
      this.availableVoices.set(voices);
      this.selectBestVoiceForLanguage(this.selectedLanguageCode());
      return;
    }

    // Chromium/Linux: getVoices() reste [] tant que le moteur speech-dispatcher
    // n'a pas été réveillé. Après 2 polls vides, utterance muette (volume 0)
    // pour forcer l'initialisation du moteur.
    this.emptyPolls += 1;
    if (this.emptyPolls === 2 && !this.warmupDone) {
      this.warmupDone = true;
      this.warmUpEngine();
    }

    // Backoff: 4x 500ms puis 6x 1000ms. reloadVoices() repart de zéro.
    if (!this.voicesRefreshTimer && this.emptyPolls <= 10) {
      const delay = this.emptyPolls <= 4 ? 500 : 1000;
      this.voicesRefreshTimer = setTimeout(() => {
        this.voicesRefreshTimer = null;
        this.loadVoices();
      }, delay);
    }
  }

  private warmUpEngine(): void {
    try {
      const warmup = new SpeechSynthesisUtterance('.');
      warmup.volume = 0;
      window.speechSynthesis.speak(warmup);
    } catch {
      // moteur indisponible: le polling continue tel quel
    }
  }

  private selectBestVoiceForLanguage(langCode: string): void {
    const voices = this.availableVoices();
    if (voices.length === 0) return;

    const langPrefix = langCode.toLowerCase();
    const current = this.selectedVoice();
    const currentExists =
      current !== null && voices.some((v) => v.name === current.name);
    const currentMatches =
      current !== null && current.lang.toLowerCase().startsWith(langPrefix);

    // Préserve le choix utilisateur tant qu'il existe et correspond.
    if (currentExists && currentMatches) return;

    const matching = voices.find((v) =>
      v.lang.toLowerCase().startsWith(langPrefix)
    );
    this.selectedVoice.set(matching ?? voices[0]);
  }
}
