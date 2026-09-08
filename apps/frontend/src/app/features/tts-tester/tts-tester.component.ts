import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly text = signal<string>('');
  readonly voices = signal<SpeechSynthesisVoice[]>([]);
  readonly selectedVoice = signal<SpeechSynthesisVoice | null>(null);
  readonly isSpeaking = signal<boolean>(false);

  constructor() {
    this.loadVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      this.loadVoices();
    };
  }

  private loadVoices(): void {
    const availableVoices = window.speechSynthesis.getVoices();
    this.voices.set(availableVoices);

    if (!this.selectedVoice() && availableVoices.length > 0) {
      const defaultVoice =
        availableVoices.find((v) => v.lang.startsWith('en')) ||
        availableVoices[0];
      this.selectedVoice.set(defaultVoice);
    }
  }

  onVoiceChange(voiceName: string): void {
    const voice = this.voices().find((v) => v.name === voiceName);
    if (voice) {
      this.selectedVoice.set(voice);
    }
  }

  speak(): void {
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

  stop(): void {
    window.speechSynthesis.cancel();
    this.isSpeaking.set(false);
  }
}
