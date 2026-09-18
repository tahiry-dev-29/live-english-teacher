import {
  Component,
  inject,
  signal,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { LucideMic, LucideSquare } from '@lucide/angular';
import { AudioRecorderService } from '@core/services/audio-recorder-service';
import { MESSAGES } from '@core/constants/messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audio-recorder',
  standalone: true,
  imports: [LucideMic, LucideSquare],
  template: `
    @if (!isRecording()) {
      <button
        type="button"
        (click)="startRecording()"
        class="btn btn-circle h-9 min-h-0 w-9 btn-ghost text-base-content/60 btn-sm hover:bg-base-300 hover:text-base-content"
        title="Voice input"
        aria-label="Start voice input"
      >
        <svg lucideMic class="h-[18px] w-[18px]"></svg>
      </button>
    } @else {
      <button
        type="button"
        (click)="stopRecording()"
        class="btn btn-circle h-9 min-h-0 w-9 animate-pulse border border-error/50 bg-error/15 text-error btn-sm"
        title="Stop recording"
        aria-label="Stop recording"
      >
        <svg lucideSquare class="h-4 w-4"></svg>
      </button>
    }
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
      console.error(MESSAGES.log.recordingStartFailed, error);
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
      console.error(MESSAGES.log.recordingStopFailed, error);
      this.isRecording.set(false);
      this.recordingStateChange.emit(false);
    }
  }
}
