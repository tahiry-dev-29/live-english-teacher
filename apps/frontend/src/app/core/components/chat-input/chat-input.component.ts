import { Component, input, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSquare } from '@lucide/angular';
import { AudioRecorderComponent } from '@features/chat-room/components/audio-recorder/audio-recorder';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSquare,
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
            (ngModelChange)="onInputChange($event)"
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
          <app-audio-recorder (audioRecorded)="onAudioRecorded($event)"
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
          <!-- Main action button: Send (waves) or Live call -->
          @if (value().trim()) {
          <!-- Send message button -->
          <button
            (click)="onSubmit()"
            [disabled]="disabled()"
            class="btn btn-circle btn-primary"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-5 h-5"
            >
              <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5-8 5 5 0 0 0-5-5 8 8 0 0 1-5-5 5 5 0 0 0-5 5 5 5 0 0 0 5 5Z" />
              <path d="M12 12a5 5 0 0 0-5 5 8 8 0 0 1 5-8 5 5 0 0 0 5 5 8 8 0 0 1-5-5 5 5 0 0 0-5-5Z" />
            </svg>
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
            @if (isLiveActive()) {
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-5 h-5"
            >
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
            } @else {
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-5 h-5"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            }
          </button>
          }
          }
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
  value = input<string>('');
  disabled = input<boolean>(false);
  isLoading = input<boolean>(false);
  isPlaying = input<boolean>(false);
  isRecording = input<boolean>(false);
  isLiveActive = input<boolean>(false);

  valueChange = output<string>();
  messageSent = output<void>();
  audioRecorded = output<{ base64: string }>();
  stop = output<void>();
  recordingStateChange = output<boolean>();
  liveToggled = output<void>();

  readonly audioRecorder = viewChild(AudioRecorderComponent);

  onInputChange(val: string) {
    this.valueChange.emit(val);
  }

  onSubmit() {
    if (this.value().trim() && !this.disabled() && !this.isLoading()) {
      this.messageSent.emit();
    }
  }

  onAudioRecorded(event: { base64: string }) {
    this.audioRecorded.emit(event);
  }

  onStop() {
    this.stop.emit();
  }
}
