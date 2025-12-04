import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Language {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <!-- Backdrop -->
      <button 
        type="button"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in cursor-default border-none"
        (click)="handleCancel()"
        (keyup.escape)="handleCancel()"
        aria-label="Close dialog">
      </button>
      
      <!-- Dialog -->
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title">
        <div 
          class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto animate-slide-up max-h-[90vh] overflow-hidden flex flex-col">
          
          <!-- Header -->
          <div class="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-blue-400">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 id="settings-title" class="text-lg font-semibold text-white">Settings</h2>
            </div>
            <button 
              type="button"
              (click)="handleCancel()"
              class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Content -->
          <div class="p-5 space-y-6 overflow-y-auto flex-1">
            
            <!-- Language Section -->
            <div class="space-y-3">
              <label for="language" class="flex items-center gap-2 text-sm font-medium text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-blue-400">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                Learning Language
              </label>
              <div class="grid grid-cols-3 gap-2">
                @for (lang of languagesList; track lang.code) {
                  <button 
                    type="button"
                    (click)="tempLanguage.set(lang.code)"
                    class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border"
                    [class.bg-gradient-to-r]="tempLanguage() === lang.code"
                    [class.from-blue-600]="tempLanguage() === lang.code"
                    [class.to-purple-600]="tempLanguage() === lang.code"
                    [class.text-white]="tempLanguage() === lang.code"
                    [class.border-transparent]="tempLanguage() === lang.code"
                    [class.shadow-lg]="tempLanguage() === lang.code"
                    [class.shadow-blue-500/25]="tempLanguage() === lang.code"
                    [class.bg-gray-800/50]="tempLanguage() !== lang.code"
                    [class.text-gray-300]="tempLanguage() !== lang.code"
                    [class.border-gray-700]="tempLanguage() !== lang.code"
                    [class.hover:bg-gray-700]="tempLanguage() !== lang.code"
                    [class.hover:border-gray-600]="tempLanguage() !== lang.code">
                    <span class="text-base">{{ lang.flag }}</span>
                    <span>{{ lang.name }}</span>
                  </button>
                }
              </div>
            </div>
            
            <!-- Voice Preview Section -->
            <div class="space-y-3">
              <label for="voice" class="flex items-center gap-2 text-sm font-medium text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-purple-400">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                AI Voice
                <span class="text-xs text-gray-500 ml-auto">{{ filteredVoices().length }} voices available</span>
              </label>
              
              <!-- Voice List -->
              <div class="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700" role="listbox">
                @for (voice of filteredVoices(); track voice.name) {
                  <button 
                    type="button"
                    role="option"
                    [attr.aria-selected]="tempVoiceName() === voice.name"
                    class="w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group border text-left"
                    [class.bg-gradient-to-r]="tempVoiceName() === voice.name"
                    [class.from-purple-600/20]="tempVoiceName() === voice.name"
                    [class.to-pink-600/20]="tempVoiceName() === voice.name"
                    [class.border-purple-500/50]="tempVoiceName() === voice.name"
                    [class.bg-gray-800/30]="tempVoiceName() !== voice.name"
                    [class.border-gray-700/50]="tempVoiceName() !== voice.name"
                    [class.hover:bg-gray-800]="tempVoiceName() !== voice.name"
                    [class.hover:border-gray-600]="tempVoiceName() !== voice.name"
                    (click)="tempVoiceName.set(voice.name)">
                    
                    <!-- Voice Info -->
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-white truncate">{{ voice.name }}</div>
                      <div class="text-xs text-gray-500 truncate">{{ voice.lang }}</div>
                    </div>
                    
                    <!-- Play Button -->
                    <button 
                      type="button"
                      (click)="previewVoice(voice); $event.stopPropagation()"
                      class="p-2 rounded-lg transition-all cursor-pointer shrink-0"
                      [class.bg-purple-500]="playingVoice() === voice.name"
                      [class.text-white]="playingVoice() === voice.name"
                      [class.bg-gray-700]="playingVoice() !== voice.name"
                      [class.text-gray-300]="playingVoice() !== voice.name"
                      [class.hover:bg-gray-600]="playingVoice() !== voice.name"
                      [attr.aria-label]="playingVoice() === voice.name ? 'Stop preview' : 'Preview voice'">
                      @if (playingVoice() === voice.name) {
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 animate-pulse">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                        </svg>
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                      }
                    </button>
                    
                    <!-- Selected Indicator -->
                    @if (tempVoiceName() === voice.name) {
                      <div class="w-2 h-2 rounded-full bg-purple-500 shrink-0"></div>
                    }
                  </button>
                } @empty {
                  <div class="text-center py-8 text-gray-500 text-sm">
                    No voices available for this language
                  </div>
                }
              </div>
            </div>
            
          </div>
          
          <!-- Footer -->
          <div class="p-5 border-t border-gray-800 bg-gray-900/50 shrink-0 flex gap-3">
            <button 
              type="button"
              (click)="handleCancel()"
              class="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium rounded-xl transition-all cursor-pointer border border-gray-700 hover:border-gray-600">
              Cancel
            </button>
            <button 
              type="button"
              (click)="handleSave()"
              class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 active:scale-[0.98]">
              Save
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slide-up {
      from { 
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
    
    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }
    
    .scrollbar-thin::-webkit-scrollbar {
      width: 4px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: #374151;
      border-radius: 4px;
    }
    
    .scrollbar-thumb-gray-700::-webkit-scrollbar-thumb:hover {
      background: #4B5563;
    }
  `]
})
export class SettingsDialogComponent {
  isOpen = input(false);
  languages = input<{ code: string; name: string }[]>([]);
  voices = input<SpeechSynthesisVoice[]>([]);
  selectedLanguage = input('en');
  selectedVoiceName = input('');
  
  closed = output<void>();
  languageChange = output<string>();
  voiceChange = output<string>();
  
  // Temp values for cancel functionality
  tempLanguage = signal('en');
  tempVoiceName = signal('');
  playingVoice = signal<string | null>(null);
  
  // Languages with flags
  languagesList: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  ];
  
  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.tempLanguage.set(this.selectedLanguage());
        this.tempVoiceName.set(this.selectedVoiceName());
      }
    });
  }
  
  filteredVoices = computed(() => {
    const lang = this.tempLanguage();
    return this.voices().filter(v => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
  });
  
  private sampleTexts: Record<string, string> = {
    'en': 'Hello! This is a sample of my voice. Nice to meet you!',
    'fr': 'Bonjour! Ceci est un exemple de ma voix. Enchanté!',
    'es': '¡Hola! Este es un ejemplo de mi voz. ¡Mucho gusto!',
    'de': 'Hallo! Dies ist ein Beispiel meiner Stimme. Freut mich!',
    'it': 'Ciao! Questo è un esempio della mia voce. Piacere!',
    'ja': 'こんにちは！これは私の声のサンプルです。よろしくお願いします！',
  };
  
  handleSave() {
    window.speechSynthesis.cancel();
    this.playingVoice.set(null);
    this.languageChange.emit(this.tempLanguage());
    this.voiceChange.emit(this.tempVoiceName());
    this.closed.emit();
  }
  
  handleCancel() {
    window.speechSynthesis.cancel();
    this.playingVoice.set(null);
    this.tempLanguage.set(this.selectedLanguage());
    this.tempVoiceName.set(this.selectedVoiceName());
    this.closed.emit();
  }
  
  previewVoice(voice: SpeechSynthesisVoice) {
    if (this.playingVoice() === voice.name) {
      window.speechSynthesis.cancel();
      this.playingVoice.set(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    const langCode = voice.lang.split('-')[0].toLowerCase();
    const text = this.sampleTexts[langCode] || this.sampleTexts['en'];
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    
    utterance.onstart = () => this.playingVoice.set(voice.name);
    utterance.onend = () => this.playingVoice.set(null);
    utterance.onerror = () => this.playingVoice.set(null);
    
    window.speechSynthesis.speak(utterance);
  }
}
