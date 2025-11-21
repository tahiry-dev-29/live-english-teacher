import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Mobile Overlay -->
    @if (isOpen() && isMobile) {
      <div class="fixed inset-0 bg-black/50 z-20" (click)="toggle()" (keyup.enter)="toggle()" tabindex="0" role="button" aria-label="Close sidebar overlay"></div>
    }

    <!-- Sidebar Container -->
    <aside 
      class="fixed md:relative z-30 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col"
      [class.w-64]="isOpen()"
      [class.w-0]="!isOpen()"
      [class.opacity-0]="!isOpen()"
      [class.md:opacity-100]="true"
      [class.overflow-hidden]="!isOpen()">
      
      <!-- Header / New Chat -->
      <div class="p-4 border-b border-gray-800 flex items-center justify-between">
        <div class="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
          Live Teacher
        </div>
        <button (click)="toggle()" class="md:hidden text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      <div class="p-4">
        <button (click)="onNewChat()" class="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40">
          <span class="text-xl font-light">+</span>
          <span class="font-medium">New Chat</span>
        </button>
      </div>

      <!-- History -->
      <div class="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-800">
        <div class="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">History</div>
        @for (item of history(); track item.id) {
          <button class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 text-sm truncate transition-colors group flex items-center gap-2">
            <span class="text-gray-500 group-hover:text-gray-400">💬</span>
            {{ item.title }}
          </button>
        } @empty {
          <div class="px-3 py-2 text-sm text-gray-600 italic text-center">No history yet</div>
        }
      </div>

      <!-- Settings -->
      <div class="p-4 border-t border-gray-800 bg-gray-900/50 space-y-4">
        
        <!-- Language -->
        <div class="space-y-1.5">
          <label for="lang-select" class="text-xs font-medium text-gray-500 flex items-center gap-1">
            <span>🌐</span> Learning Language
          </label>
          <select 
            id="lang-select"
            [ngModel]="selectedLanguage()" 
            (ngModelChange)="selectedLanguage.set($event)"
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:ring-1 focus:ring-blue-500 outline-none transition-colors">
            @for (lang of languages; track lang.code) {
              <option [value]="lang.code">{{ lang.name }}</option>
            }
          </select>
        </div>

        <!-- Voice -->
        <div class="space-y-1.5">
          <label for="voice-select" class="text-xs font-medium text-gray-500 flex items-center gap-1">
            <span>🗣️</span> AI Voice
          </label>
          <select 
            id="voice-select"
            [ngModel]="selectedVoice()?.name"
            (ngModelChange)="onVoiceChange($event)"
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:ring-1 focus:ring-blue-500 outline-none transition-colors">
            @for (voice of voices(); track voice.name) {
              <option [value]="voice.name">{{ voice.name }}</option>
            }
          </select>
        </div>

      </div>
    </aside>
  `
})
export class SidebarComponent {
  isOpen = signal(true);
  isMobile = false; // Simple check, could be improved with BreakpointObserver
  
  // Settings
  languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
  ];
  selectedLanguage = signal('en');

  // Voice Settings
  voices = signal<SpeechSynthesisVoice[]>([]);
  selectedVoice = signal<SpeechSynthesisVoice | null>(null);

  // History (Mock)
  history = signal([
    { id: 1, title: 'Introduction & Greetings' },
    { id: 2, title: 'Ordering Coffee' },
    { id: 3, title: 'Job Interview Prep' },
  ]);

  newChat = output<void>();

  constructor() {
    this.loadVoices();
    window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    
    // Basic mobile check
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  toggle() {
    this.isOpen.update(v => !v);
  }

  onNewChat() {
    this.newChat.emit();
    if (this.isMobile) this.isOpen.set(false);
  }

  private loadVoices() {
    const availableVoices = window.speechSynthesis.getVoices();
    this.voices.set(availableVoices);
    if (!this.selectedVoice() && availableVoices.length > 0) {
      // Try to match selected language
      const langCode = this.selectedLanguage();
      const defaultVoice = availableVoices.find(v => v.lang.startsWith(langCode)) || availableVoices[0];
      this.selectedVoice.set(defaultVoice);
    }
  }

  onVoiceChange(name: string) {
    const voice = this.voices().find(v => v.name === name);
    if (voice) this.selectedVoice.set(voice);
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.isOpen.set(false);
    } else {
      this.isOpen.set(true);
    }
  }
}
