import {
  Component,
  signal,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
} from '@angular/core';
import { ElevenLabsVoiceService } from '@features/tts-voice/services/elevenlabs-voice.service';
import { TtsService } from '@features/tts-voice/services/tts.service';

/** Server TTS tester: previews the selected provider voice via POST /ai/tts. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tts-tester',
  standalone: true,
  imports: [],
  template: `
    <div
      class="card mx-auto max-w-2xl border border-base-300 bg-base-200 text-base-content shadow-xl"
    >
      <h2
        class="card-title bg-gradient-to-r from-primary to-secondary bg-clip-text text-2xl font-bold text-transparent"
      >
        Server TTS Tester
      </h2>

      <div class="space-y-2">
        <label
          for="tts-input"
          class="label-text font-medium text-base-content/70"
          >Text to Read</label
        >
        <textarea
          id="tts-input"
          [value]="text()"
          (input)="text.set($any($event.target).value)"
          rows="4"
          class="textarea w-full resize-none"
          placeholder="Type something here..."
        ></textarea>
        <p class="text-xs opacity-60">
          Voice: {{ voiceService.selectedVoiceId() || 'provider default' }} ·
          Model: {{ voiceService.selectedModelId() || 'provider default' }}
        </p>
      </div>

      <div class="flex gap-4">
        <button
          (click)="speak()"
          [disabled]="!text() || isSpeaking()"
          class="btn flex-1 gap-2 btn-primary"
        >
          {{ isSpeaking() ? 'Speaking…' : 'Speak' }}
        </button>

        <button
          (click)="stop()"
          [disabled]="!isSpeaking()"
          class="btn btn-outline btn-error"
        >
          Stop
        </button>
      </div>
      @if (error()) {
        <p class="rounded-lg bg-error/10 p-2 text-xs text-error">
          {{ error() }}
        </p>
      }
    </div>
  `,
})
export class TtsTesterComponent {
  readonly voiceService = inject(ElevenLabsVoiceService);
  private readonly speaker = inject(TtsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly text = signal<string>('Hello! I am your AI English tutor.');
  readonly isSpeaking = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.speaker.stop());
  }

  speak(): void {
    const text = this.text().trim();
    if (!text) return;
    this.error.set(null);
    this.isSpeaking.set(true);
    void this.speaker
      .speak(text, {
        onEnd: () => this.isSpeaking.set(false),
        onError: () => {
          this.isSpeaking.set(false);
          this.error.set('TTS unavailable — add an API key for this provider.');
        },
      })
      .catch(() => {
        this.isSpeaking.set(false);
        this.error.set('TTS request failed.');
      });
  }

  stop(): void {
    this.speaker.stop();
    this.isSpeaking.set(false);
  }
}
