import { Component, input, output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSquare, LucideSend, LucideMic } from '@lucide/angular';
import { AudioRecorderComponent } from '@features/chat-room/components/audio-recorder/audio-recorder';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideSquare, LucideSend, LucideMic, AudioRecorderComponent],
  template: `
    <div class="w-full max-w-4xl mx-auto px-4 pb-2">
      <div class="flex items-center gap-2 bg-base-200/80 backdrop-blur-sm rounded-2xl border border-base-300 focus-within:border-primary/60 transition-all px-3 py-2 shadow-lg">
        
        <!-- Mic / Audio Recorder -->
        <app-audio-recorder
          (audioRecorded)="onAudioRecorded($event)"
          class="shrink-0"
        ></app-audio-recorder>

        <!-- Input area -->
        <div class="flex-1 min-w-0">
          @if (audioRecorder?.isRecording()) {
            <div class="flex items-center gap-2 py-1">
              <span class="loading loading-dots loading-sm text-error"></span>
              <span class="text-sm text-base-content/60">Recording...</span>
            </div>
          } @else {
            <input
              type="text"
              [ngModel]="value()"
              (ngModelChange)="onInputChange($event)"
              (keyup.enter)="onSubmit()"
              placeholder="Type a message..."
              [disabled]="disabled()"
              class="w-full bg-transparent border-none outline-none text-base-content placeholder:text-base-content/40 text-sm"
            />
          }
        </div>

        <!-- Live button -->
        @if (showLiveButton()) {
          <button
            (click)="liveToggled.emit()"
            class="btn btn-circle btn-sm shrink-0 transition-all"
            [class.btn-error]="isLiveActive()"
            [class.btn-ghost]="!isLiveActive()"
            [title]="isLiveActive() ? 'Stop live call' : 'Start live call'"
            aria-label="Toggle Live Call"
          >
            <svg lucideMic class="w-4 h-4"></svg>
          </button>
        }

        <!-- Stop button -->
        @if (isLoading() || isPlaying()) {
          <button
            (click)="onStop()"
            class="btn btn-circle btn-sm btn-error shrink-0"
            title="Stop"
            aria-label="Stop"
          >
            <svg lucideSquare class="w-4 h-4"></svg>
          </button>
        } @else if (!audioRecorder?.isRecording()) {
          <button
            (click)="onSubmit()"
            [disabled]="!value().trim() || disabled()"
            class="btn btn-circle btn-sm btn-primary shrink-0"
            aria-label="Send message"
          >
            <svg lucideSend class="w-4 h-4"></svg>
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
  value = input<string>('');
  disabled = input<boolean>(false);
  isLoading = input<boolean>(false);
  isPlaying = input<boolean>(false);
  showLiveButton = input<boolean>(false);
  isLiveActive = input<boolean>(false);

  valueChange = output<string>();
  messageSent = output<void>();
  audioRecorded = output<{ base64: string }>();
  stop = output<void>();
  liveToggled = output<void>();

  @ViewChild(AudioRecorderComponent) audioRecorder?: AudioRecorderComponent;

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
