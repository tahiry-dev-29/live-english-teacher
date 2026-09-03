import { Component, input, output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioRecorderComponent } from '@features/chat-room/components/audio-recorder/audio-recorder';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule, AudioRecorderComponent],
  template: `
    <div class="w-full max-w-4xl mx-auto flex items-center gap-3 p-2">
      <app-audio-recorder
        (audioRecorded)="onAudioRecorded($event)"
        class="flex-shrink-0"
      >
      </app-audio-recorder>

      <div
        class="flex-1 bg-base-200/80 backdrop-blur-sm rounded-full border border-base-300 focus-within:border-primary/60 focus-within:bg-base-200 transition-all flex items-center px-4 py-3 shadow-lg"
      >
        @if (audioRecorder?.isRecording()) {
          <div class="flex-1 flex items-center gap-3 text-error px-1">
            <span class="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
            <span class="text-sm font-medium text-base-content/80">Recording...</span>
            <span class="loading loading-dots loading-sm text-error ml-auto"></span>
          </div>
        } @else {
          <input
            type="text"
            [ngModel]="value()"
            (ngModelChange)="onInputChange($event)"
            (keyup.enter)="onSubmit()"
            placeholder="Type a message..."
            class="flex-1 bg-transparent border-none outline-none text-base-content placeholder:text-base-content/40 text-base"
          />
        }

        @if (showLiveButton()) {
          <button
            (click)="liveToggled.emit()"
            class="ml-2 p-2 transition-transform transform hover:scale-110 active:scale-95"
            [class.text-error]="isLiveActive()"
            [class.text-base-content/50]="!isLiveActive()"
            aria-label="Toggle Live Call"
            title="Toggle Live Call"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </button>
        }

        @if (isLoading() || isPlaying()) {
        <button
          (click)="onStop()"
          class="ml-2 p-2 text-error hover:opacity-80 transition-transform transform hover:scale-110 active:scale-95"
          title="Stop"
          aria-label="Stop"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
            <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clip-rule="evenodd" />
          </svg>
        </button>
        } @else if (!audioRecorder?.isRecording()) {
        <button
          (click)="onSubmit()"
          [disabled]="!value().trim() || disabled()"
          class="ml-2 p-2 text-primary hover:text-secondary disabled:text-base-content/30 transition-colors transform hover:scale-110 active:scale-95"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
        }
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
  @ViewChild(AudioRecorderComponent) audioRecorder!: AudioRecorderComponent;

  value = input('');
  disabled = input(false);
  isLoading = input(false);
  isPlaying = input(false);
  showLiveButton = input(false);
  isLiveActive = input(false);

  valueChange = output<string>();
  messageSent = output<void>();
  typing = output<void>();
  audioRecorded = output<{ base64: string }>();
  stop = output<void>();
  liveToggled = output<void>();

  onInputChange(newValue: string) {
    this.valueChange.emit(newValue);
    this.typing.emit();
  }

  onSubmit() {
    if (this.value().trim() && !this.disabled()) {
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
