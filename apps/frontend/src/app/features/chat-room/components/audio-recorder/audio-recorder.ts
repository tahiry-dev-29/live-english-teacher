import { Component, inject, signal, output } from '@angular/core';
import { AudioRecorderService } from '../../../../core/services/audio-recorder-service';

@Component({
  selector: 'app-audio-recorder',
  standalone: true,
  imports: [],
  template: `
    <div class="flex gap-2 items-center">
      @if (!isRecording()) {
        <button (click)="startRecording()" 
                class="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                title="Start Recording">
          🎤
        </button>
      }
      @if (isRecording()) {
        <button (click)="stopRecording()" 
                class="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-900 animate-pulse"
                title="Stop Recording">
          ⏹️
        </button>
      }
      @if (isRecording()) {
        <span class="text-red-500 text-sm font-bold">Recording...</span>
      }
    </div>
  `
})
export class AudioRecorderComponent {
  audioRecorded = output<{ base64: string }>();
  
  private audioRecorderService = inject(AudioRecorderService);
  isRecording = signal(false);

  async startRecording() {
    try {
      await this.audioRecorderService.startRecording();
      this.isRecording.set(true);
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  }

  async stopRecording() {
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
