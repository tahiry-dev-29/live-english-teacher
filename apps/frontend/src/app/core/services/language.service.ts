import { Injectable, signal, computed, effect } from '@angular/core';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

@Injectable({
  providedIn: 'root'
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
    const voice = this.availableVoices().find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice.set(voice);
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined') return;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.availableVoices.set(voices);
      
      if (!this.selectedVoice()) {
        this.selectBestVoiceForLanguage(this.selectedLanguageCode());
      }
    }
  }

  private selectBestVoiceForLanguage(langCode: string) {
    const voices = this.availableVoices();
    if (voices.length === 0) return;

    const matchingVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith(langCode.toLowerCase())
    );

    if (matchingVoice) {
      this.selectedVoice.set(matchingVoice);
    } else {
      if (!this.selectedVoice()?.lang.toLowerCase().startsWith(langCode.toLowerCase())) {
         this.selectedVoice.set(voices[0]);
      }
    }
  }
}
