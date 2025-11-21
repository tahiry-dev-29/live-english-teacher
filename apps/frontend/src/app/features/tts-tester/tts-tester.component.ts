import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tts-tester',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="p-6 bg-gray-800 rounded-2xl shadow-xl max-w-2xl mx-auto text-white space-y-6">
      <h2 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Browser TTS Tester
      </h2>

      <!-- Voice Selection -->
      <div class="space-y-2">
        <label for="voice-select" class="text-sm text-gray-400 font-medium">Select Voice</label>
        <div class="relative">
          <select 
            id="voice-select"
            [ngModel]="selectedVoice()?.name"
            (ngModelChange)="onVoiceChange($event)"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
            @for (voice of voices(); track voice.name) {
              <option [value]="voice.name">
                {{ voice.name }} ({{ voice.lang }})
              </option>
            }
          </select>
          <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            ▼
          </div>
        </div>
      </div>

      <!-- Text Input -->
      <div class="space-y-2">
        <label for="tts-input" class="text-sm text-gray-400 font-medium">Text to Read</label>
        <textarea
          id="tts-input"
          [ngModel]="text()"
          (ngModelChange)="text.set($event)"
          rows="4"
          class="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
          placeholder="Type something here..."></textarea>
      </div>

      <!-- Controls -->
      <div class="flex gap-4">
        <button 
          (click)="speak()"
          [disabled]="!text() || isSpeaking()"
          class="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2">
          @if (isSpeaking()) {
            <span class="animate-spin">⟳</span> Speaking...
          } @else {
            <span>▶</span> Speak
          }
        </button>

        <button 
          (click)="stop()"
          [disabled]="!isSpeaking()"
          class="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg font-medium transition-colors disabled:opacity-30">
          Stop
        </button>
      </div>
    </div>
  `
})
export class TtsTesterComponent {
  text = signal('');
  voices = signal<SpeechSynthesisVoice[]>([]);
  selectedVoice = signal<SpeechSynthesisVoice | null>(null);
  isSpeaking = signal(false);

  constructor() {
    // Load voices
    this.loadVoices();
    
    // Handle dynamic voice loading (Chrome needs this)
    window.speechSynthesis.onvoiceschanged = () => {
      this.loadVoices();
    };
  }

  private loadVoices() {
    const availableVoices = window.speechSynthesis.getVoices();
    this.voices.set(availableVoices);
    
    // Default to first English voice if available
    if (!this.selectedVoice() && availableVoices.length > 0) {
      const defaultVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
      this.selectedVoice.set(defaultVoice);
    }
  }

  onVoiceChange(voiceName: string) {
    const voice = this.voices().find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice.set(voice);
    }
  }

  speak() {
    if (!this.text()) return;

    this.stop();
    this.isSpeaking.set(true);

    const utterance = new SpeechSynthesisUtterance(this.text());
    const voice = this.selectedVoice();
    
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      this.isSpeaking.set(false);
    };

    utterance.onerror = () => {
      this.isSpeaking.set(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  stop() {
    window.speechSynthesis.cancel();
    this.isSpeaking.set(false);
  }
}
