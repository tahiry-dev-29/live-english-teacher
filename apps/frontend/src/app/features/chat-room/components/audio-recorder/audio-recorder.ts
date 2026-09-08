import { Component, inject, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideMic, LucideSquare } from '@lucide/angular';
import { AudioRecorderService } from '@core/services/audio-recorder-service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audio-recorder',
  standalone: true,
  imports: [LucideMic, LucideSquare],
  template: `
    <div class="flex items-center">
      @if (!isRecording()) {
      <button
        (click)="startRecording()"
        class="btn btn-circle btn-error"
        title="Start Recording"
      >
        <svg lucideMic class="w-6 h-6"></svg>
      </button>
      } @if (isRecording()) {
      <button
        (click)="stopRecording()"
        class="btn btn-circle bg-base-300 text-error border-2 border-error animate-pulse"
        title="Stop Recording"
      >
        <svg lucideSquare class="w-6 h-6"></svg>
      </button>
      }
    </div>
  `,
})
export class AudioRecorderComponent {
  audioRecorded = output<{ base64: string }>();
  recordingStateChange = output<boolean>();

  private audioRecorderService = inject(AudioRecorderService);
  isRecording = signal(false);

  async startRecording() {
    if (this.isRecording()) return;
    try {
      await this.audioRecorderService.startRecording();
      this.isRecording.set(true);
      this.recordingStateChange.emit(true);
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  }

  async stopRecording() {
    if (!this.isRecording()) return;
    try {
      const result = await this.audioRecorderService.stopRecording();
      this.isRecording.set(false);
      this.recordingStateChange.emit(false);
      this.audioRecorded.emit({ base64: result.base64 });
    } catch (error) {
      console.error('Failed to stop recording', error);
      this.isRecording.set(false);
      this.recordingStateChange.emit(false);
    }
  }
}
