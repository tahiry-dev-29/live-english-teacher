import { Component, input, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSquare, LucidePlus } from '@lucide/angular';
import { AudioRecorderComponent } from '@features/chat-room/components/audio-recorder/audio-recorder';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSquare,
    LucidePlus,
    AudioRecorderComponent,
  ],
  template: `
    <div class="w-full max-w-4xl mx-auto px-4 pb-2">
      <div
        class="flex items-center gap-3 bg-base-300 rounded-2xl px-4 py-3 shadow-lg"
      >
        <!-- + Button -->
        <button
          (click)="onNewChat()"
          class="btn btn-circle btn-sm bg-base-content text-base-300 hover:bg-base-content/90 shrink-0"
          title="New Chat"
          aria-label="New Chat"
        >
          <svg lucidePlus class="w-5 h-5"></svg>
        </button>

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
          <!-- Main action button with waves -->
          <button
            (click)="onSubmit()"
            [disabled]="!value().trim() || disabled()"
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

  valueChange = output<string>();
  messageSent = output<void>();
  audioRecorded = output<{ base64: string }>();
  stop = output<void>();
  recordingStateChange = output<boolean>();
  newChat = output<void>();

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

  onNewChat() {
    this.newChat.emit();
  }
}
