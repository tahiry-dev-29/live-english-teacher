import { Component, inject, signal, output } from '@angular/core';
import { LucideMic, LucideSquare } from '@lucide/angular';
import { AudioRecorderService } from '@core/services/audio-recorder-service';

@Component({
  selector: 'app-audio-recorder',
  standalone: true,
  imports: [LucideMic, LucideSquare],
  template: `
    <div class="flex items-center">
      @if (!isRecording()) {
      <button
        (click)="startRecording()"
        class="btn btn-circle btn-error shadow-lg shadow-error/30 transition-transform hover:scale-105 active:scale-95"
        title="Start Recording"
      >
        <svg lucideMic class="w-6 h-6"></svg>
      </button>
      } @if (isRecording()) {
      <button
        (click)="stopRecording()"
        class="btn btn-circle btn-outline btn-error border-2 shadow-lg animate-pulse"
        title="Stop Recording"
      >
        <svg lucideSquare class="w-6 h-6 text-red-500"></svg>
      </button>
      }
    </div>
  `,
})
export class AudioRecorderComponent {
  audioRecorded = output<{ base64: string }>();

  private audioRecorderService = inject(AudioRecorderService);
  isRecording = signal(false);

  async startRecording() {
    if (this.isRecording()) return;
    try {
      await this.audioRecorderService.startRecording();
      this.isRecording.set(true);
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  }

  async stopRecording() {
    if (!this.isRecording()) return;
    try {
      const result = await this.audioRecorderService.stopRecording();
      this.isRecording.set(false);
      this.audioRecorded.emit({ base64: result.base64 });
    } catch (error) {
      console.error('Failed to stop recording', error);
      this.isRecording.set(false);
    }
  }
}
