import { Component, inject, signal, output } from '@angular/core';
import { AudioRecorderService } from '../../../../core/services/audio-recorder-service';

@Component({
  selector: 'app-audio-recorder',
  standalone: true,
  imports: [],
  template: `
    <div class="flex items-center">
      @if (!isRecording()) {
        <button (click)="startRecording()" 
                class="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-all shadow-lg hover:shadow-red-500/50 active:scale-95 flex items-center justify-center"
                title="Start Recording">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
            <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
            <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
          </svg>
        </button>
      }
      @if (isRecording()) {
        <button (click)="stopRecording()" 
                class="bg-gray-700 text-white p-3 rounded-full hover:bg-gray-600 transition-all animate-pulse shadow-lg border-2 border-red-500 flex items-center justify-center"
                title="Stop Recording">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-red-500">
            <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clip-rule="evenodd" />
          </svg>
        </button>
      }
    </div>
  `
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
      this.isRecording.set(false);
    }
  }
}
