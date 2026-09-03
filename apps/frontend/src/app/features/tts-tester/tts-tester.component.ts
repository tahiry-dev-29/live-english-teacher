import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tts-tester',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="card bg-base-200 border border-base-300 shadow-xl max-w-2xl mx-auto text-base-content"
    >
      <h2
        class="card-title text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
      >
        Browser TTS Tester
      </h2>

      <!-- Voice Selection -->
      <div class="space-y-2">
        <label
          for="voice-select"
          class="label-text font-medium text-base-content/70"
          >Select Voice</label
        >
        <div class="relative">
          <select
            id="voice-select"
            [ngModel]="selectedVoice()?.name"
            (ngModelChange)="onVoiceChange($event)"
            class="select w-full"
          >
            @for (voice of voices(); track voice.name) {
            <option [value]="voice.name">
              {{ voice.name }} ({{ voice.lang }})
            </option>
            }
          </select>
          <div>▼</div>
        </div>
      </div>

      <!-- Text Input -->
      <div class="space-y-2">
        <label
          for="tts-input"
          class="label-text font-medium text-base-content/70"
          >Text to Read</label
        >
        <textarea
          id="tts-input"
          [ngModel]="text()"
          (ngModelChange)="text.set($event)"
          rows="4"
          class="textarea w-full resize-none"
          placeholder="Type something here..."
        ></textarea>
      </div>

      <!-- Controls -->
      <div class="flex gap-4">
        <button
          (click)="speak()"
          [disabled]="!text() || isSpeaking()"
          class="btn btn-primary flex-1 gap-2"
        >
          @if (isSpeaking()) {
          <span class="animate-spin">⟳</span> Speaking... } @else {
          <span>▶</span> Speak }
        </button>

        <button
          (click)="stop()"
          [disabled]="!isSpeaking()"
          class="btn btn-error btn-outline"
        >
          Stop
        </button>
      </div>
    </div>
  `,
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
      const defaultVoice =
        availableVoices.find((v) => v.lang.startsWith('en')) ||
        availableVoices[0];
      this.selectedVoice.set(defaultVoice);
    }
  }

  onVoiceChange(voiceName: string) {
    const voice = this.voices().find((v) => v.name === voiceName);
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
