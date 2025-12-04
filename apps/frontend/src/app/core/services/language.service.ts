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
  // State
  selectedLanguageCode = signal<string>('en');
  availableVoices = signal<SpeechSynthesisVoice[]>([]);
  selectedVoice = signal<SpeechSynthesisVoice | null>(null);

  // Constants
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

    // Auto-select voice when language changes
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
      
      // Initial selection if needed
      if (!this.selectedVoice()) {
        this.selectBestVoiceForLanguage(this.selectedLanguageCode());
      }
    }
  }

  private selectBestVoiceForLanguage(langCode: string) {
    const voices = this.availableVoices();
    if (voices.length === 0) return;

    // Try to find a voice that matches the language code
    // e.g. 'fr' matches 'fr-FR', 'fr-CA', etc.
    const matchingVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith(langCode.toLowerCase())
    );

    if (matchingVoice) {
      this.selectedVoice.set(matchingVoice);
    } else {
      // Fallback to first available voice if no match
      // But preferably don't change if we can't find a match, 
      // unless current voice is completely wrong? 
      // For now, let's just default to the first one if absolutely nothing matches,
      // but usually we want to keep the current one if it's valid?
      // Actually, if I switch to Japanese and I have a French voice, I want a Japanese voice.
      // So fallback is necessary.
      if (!this.selectedVoice()?.lang.toLowerCase().startsWith(langCode.toLowerCase())) {
         this.selectedVoice.set(voices[0]);
      }
    }
  }
}
