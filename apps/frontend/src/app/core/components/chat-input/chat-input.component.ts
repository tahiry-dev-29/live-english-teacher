import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioRecorderComponent } from '../../../features/chat-room/components/audio-recorder/audio-recorder';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule, AudioRecorderComponent],
  template: `
    <div class="w-full max-w-4xl mx-auto flex items-center gap-3 p-2">
      
      <!-- Red Mic Button (Recording) -->
      <app-audio-recorder 
        (audioRecorded)="onAudioRecorded($event)" 
        class="flex-shrink-0">
      </app-audio-recorder>
      
      <!-- Input Container -->
      <div class="flex-1 bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-700/50 focus-within:border-blue-500/50 focus-within:bg-gray-800 transition-all flex items-center px-4 py-3 shadow-lg">
        <input 
          type="text" 
          [ngModel]="value()" 
          (ngModelChange)="onInputChange($event)"
          (keyup.enter)="onSubmit()"
          placeholder="Type a message..." 
          class="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-base"
        />
        
        <!-- Stop Button (shown when loading or playing) -->
        @if (isLoading() || isPlaying()) {
          <button 
            (click)="onStop()" 
            class="ml-2 p-2 text-red-400 hover:text-red-300 transition-colors transform hover:scale-110 active:scale-95"
            title="Stop">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clip-rule="evenodd" />
            </svg>
          </button>
        } @else {
          <!-- Send Button -->
          <button 
            (click)="onSubmit()" 
            [disabled]="!value().trim() || disabled()"
            class="ml-2 p-2 text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition-colors transform hover:scale-110 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        }
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class ChatInputComponent {
  value = input('');
  disabled = input(false);
  isLoading = input(false);
  isPlaying = input(false);
  
  valueChange = output<string>();
  messageSent = output<void>();
  typing = output<void>();
  audioRecorded = output<{ base64: string }>();
  stop = output<void>();

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
