import { Component, input, output, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSquare, LucideAudioWaveform, LucideSend } from '@lucide/angular';
import { AudioRecorderComponent } from '@features/chat-room/components/audio-recorder/audio-recorder';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSquare,
    LucideAudioWaveform,
    LucideSend,
    AudioRecorderComponent,
  ],
  template: `
    <div class="w-full max-w-4xl mx-auto px-4 pb-2">
      <div
        class="flex items-center gap-3 bg-base-300 rounded-2xl px-4 py-3 shadow-lg"
      >
        <!-- Input area -->
        <div class="flex-1 min-w-0">
          @if (isRecording()) {
          <div class="flex items-center gap-2 text-error">
            <span class="loading loading-dots loading-sm"></span>
            <span class="text-sm font-medium">Recording…</span>
          </div>
          } @else {
          <input
            type="text"
            [ngModel]="value()"
            (ngModelChange)="valueChange.emit($event)"
            (keyup.enter)="onSubmit()"
            placeholder="Ask anything"
            [disabled]="disabled()"
            class="w-full bg-transparent border-none outline-none text-base-content placeholder:text-base-content/40 text-base"
          />
          }
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Microphone button for recording -->
          <app-audio-recorder
            (audioRecorded)="onAudioRecorded($event)"
            (recordingStateChange)="recordingStateChange.emit($event)"
            class="shrink-0"
          />

          <!-- Stop button -->
          @if (isLoading() || isPlaying()) {
          <button
            (click)="onStop()"
            class="btn btn-circle btn-sm btn-error"
            title="Stop"
            aria-label="Stop"
          >
            <svg lucideSquare class="w-4 h-4"></svg>
          </button>
          } @else if (!audioRecorder()?.isRecording()) {
          <!-- Main action button: Send or Live call -->
          @if (value().trim()) {
          <!-- Send message button -->
          <button
            (click)="onSubmit()"
            [disabled]="disabled()"
            class="btn btn-circle btn-primary"
            aria-label="Send message"
          >
            <svg lucideSend class="w-5 h-5"></svg>
          </button>
          } @else {
          <!-- Live call button -->
          <button
            (click)="liveToggled.emit()"
            class="btn btn-circle"
            [class.btn-success]="isLiveActive()"
            [class.btn-primary]="!isLiveActive()"
            [title]="isLiveActive() ? 'Stop live call' : 'Start live call'"
            aria-label="Toggle Live Call"
          >
            <svg lucideAudioWaveform class="w-5 h-5"></svg>
          </button>
          } }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ChatInputComponent {
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly isLoading = input<boolean>(false);
  readonly isPlaying = input<boolean>(false);
  readonly isRecording = input<boolean>(false);
  readonly isLiveActive = input<boolean>(false);

  readonly valueChange = output<string>();
  readonly messageSent = output<void>();
  readonly audioRecorded = output<{ base64: string }>();
  readonly stop = output<void>();
  readonly recordingStateChange = output<boolean>();
  readonly liveToggled = output<void>();

  readonly audioRecorder = viewChild(AudioRecorderComponent);

  onSubmit(): void {
    if (this.value().trim() && !this.disabled() && !this.isLoading()) {
      this.messageSent.emit();
    }
  }

  onAudioRecorded(event: { base64: string }): void {
    this.audioRecorded.emit(event);
  }

  onStop(): void {
    this.stop.emit();
  }
}
