import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AudioRecorderComponent } from './features/chat-room/components/audio-recorder/audio-recorder';

const CHAT_MUTATION = gql`
  mutation Chat($content: String!, $sessionId: String!, $audioData: String, $mimeType: String) {
    chat(content: $content, sessionId: $sessionId, audioData: $audioData, mimeType: $mimeType) {
      text
    }
  }
`;

@Component({
  imports: [RouterModule, FormsModule, CommonModule, AudioRecorderComponent],
  selector: 'app-root',
  standalone: true,
  providers: [Apollo],
  template: `
    <div class="container mx-auto p-4 max-w-2xl">
      <h1 class="text-3xl font-bold mb-4 text-center text-blue-600">Live English Teacher</h1>
      
      <div class="bg-gray-100 p-4 rounded-lg h-96 overflow-y-auto mb-4 flex flex-col gap-2">
        @for (msg of messages(); track $index) {
          <div [class]="{'self-end bg-blue-500 text-white': msg.role === 'user', 'self-start bg-white border border-gray-300': msg.role === 'ai'}"
               class="p-3 rounded-lg max-w-[80%]">
            {{ msg.text }}
          </div>
        }
        @if(loading()){
          <div class="self-start text-gray-500 italic">AI is typing...</div>
        }
      </div>

      <div class="flex gap-2 items-center">
        <app-audio-recorder (audioRecorded)="handleAudioRecorded($event)"></app-audio-recorder>
        
        <input [ngModel]="userInput()" (ngModelChange)="userInput.set($event)" (keyup.enter)="sendMessage()" 
               type="text" placeholder="Type your message..." 
               class="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
        <button (click)="sendMessage()" [disabled]="loading() || !userInput().trim()"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
          Send
        </button>
      </div>
    </div>    
  `,
  styles: ``,
})
export class App {
  protected title = 'frontend';
  userInput = signal('');
  messages = signal<{ role: 'user' | 'ai', text: string }[]>([]);
  loading = signal(false);
  sessionId = Math.random().toString(36).substring(7);

  private apollo = inject(Apollo); 

  sendMessage() {
    if (!this.userInput().trim()) return;

    const content = this.userInput();
    this.messages.update((msgs: { role: 'user' | 'ai', text: string }[]) => [...msgs, { role: 'user', text: content }]);
    this.userInput.set('');
    this.loading.set(true);

    this.apollo.mutate({
      mutation: CHAT_MUTATION,
      variables: { content, sessionId: this.sessionId },
    }).subscribe({
      next: (result: any) => {
        this.loading.set(false);
        if (result.data?.chat?.text) {
          this.messages.update((msgs: { role: 'user' | 'ai', text: string }[]) => [...msgs, { role: 'ai', text: result.data.chat.text }]);
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Error sending message', error);
        this.messages.update((msgs: { role: 'user' | 'ai', text: string }[]) => [...msgs, { role: 'ai', text: 'Error: Could not connect to AI.' }]);
      }
    });
  }

  handleAudioRecorded(event: { base64: string }) {
    this.messages.update((msgs: { role: 'user' | 'ai', text: string }[]) => [...msgs, { role: 'user', text: '🎤 [Audio Message]' }]);
    this.loading.set(true);

    this.apollo.mutate({
      mutation: CHAT_MUTATION,
      variables: { 
        content: '', // Content is empty for audio-only messages
        sessionId: this.sessionId,
        audioData: event.base64,
        mimeType: 'audio/webm' // Assuming webm from MediaRecorder
      },
    }).subscribe({
      next: (result: any) => {
        this.loading.set(false);
        if (result.data?.chat?.text) {
          this.messages.update((msgs: { role: 'user' | 'ai', text: string }[]) => [...msgs, { role: 'ai', text: result.data.chat.text }]);
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Error sending audio', error);
        this.messages.update((msgs: { role: 'user' | 'ai', text: string }[]) => [...msgs, { role: 'ai', text: 'Error: Could not send audio.' }]);
      }
    });
  }
}
