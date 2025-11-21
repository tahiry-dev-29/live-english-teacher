import { Component, inject, signal, ViewChild } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AudioRecorderComponent } from './features/chat-room/components/audio-recorder/audio-recorder';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';

const CHAT_MUTATION = gql`
  mutation Chat($content: String!, $sessionId: String!, $audioData: String, $mimeType: String) {
    chat(content: $content, sessionId: $sessionId, audioData: $audioData, mimeType: $mimeType) {
      text
      audioData
      mimeType
    }
  }
`;

@Component({
  imports: [RouterModule, FormsModule, CommonModule, AudioRecorderComponent, SidebarComponent],
  selector: 'app-root',
  standalone: true,
  providers: [Apollo],
  template: `
    <div class="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      
      <!-- Sidebar -->
      <app-sidebar (newChat)="onNewChat()"></app-sidebar>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col relative w-full h-full transition-all duration-300">
        
        <!-- Mobile Header (Toggle) -->
        <div class="md:hidden p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <button (click)="sidebar.toggle()" class="text-gray-400 hover:text-white">
            ☰
          </button>
          <span class="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Live Teacher</span>
          <div class="w-6"></div> <!-- Spacer -->
        </div>

        <!-- Header (Desktop) -->
        <div class="hidden md:flex bg-gray-900/50 backdrop-blur-md p-4 items-center justify-between border-b border-gray-800 z-10">
          <div>
            <h1 class="text-xl font-bold tracking-wide text-white">Conversation Room</h1>
            <p class="text-xs text-gray-400">Practice your English skills with AI</p>
          </div>
          
          <button (click)="toggleLiveMode()" 
                  [class]="isLiveMode() ? 'bg-red-500/10 text-red-400 border-red-500/50' : 'bg-green-500/10 text-green-400 border-green-500/50'"
                  class="border px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 hover:bg-opacity-20">
            <span [class]="isLiveMode() ? 'animate-pulse' : ''">●</span>
            {{ isLiveMode() ? 'End Live Call' : 'Start Live Call' }}
          </button>
        </div>
        
        <!-- Chat Area -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" #chatContainer>
          
          @if (messages().length === 0) {
            <div class="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 opacity-50">
              <div class="text-6xl">👋</div>
              <p class="text-lg">Start a conversation by typing or speaking!</p>
            </div>
          }

          @for (msg of messages(); track msg) {
            <div class="flex flex-col" [class.items-end]="msg.role === 'user'" [class.items-start]="msg.role === 'ai'">
              <div [class]="msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-100 rounded-bl-none'"
                   class="p-4 rounded-2xl max-w-[85%] md:max-w-[70%] shadow-sm text-sm leading-relaxed relative group">
                {{ msg.text }}
                @if (msg.audioData) {
                   <button (click)="playAudio(msg.audioData, msg.mimeType)" 
                           [disabled]="isPlaying()"
                           class="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white disabled:opacity-50 p-2">
                     @if (isPlaying() && msg === messages()[messages().length - 1]) {
                        <div class="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                     } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                     }
                   </button>
                }
              </div>
            </div>
          }

          @if (loading()) {
            <div class="flex justify-start animate-pulse">
              <div class="bg-gray-800 p-4 rounded-2xl rounded-bl-none text-gray-400 text-sm flex items-center gap-2">
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
              </div>
            </div>
          }
        </div>

        <!-- Input Area -->
        <div class="p-4 bg-gray-900 border-t border-gray-800">
          <div class="max-w-4xl mx-auto flex items-center gap-3 bg-gray-800 p-2 rounded-full shadow-lg border border-gray-700 focus-within:border-blue-500 transition-colors">
            
            <app-audio-recorder (audioRecorded)="handleAudioRecorded($event)" class="flex-shrink-0"></app-audio-recorder>
            
            <input 
              type="text" 
              [ngModel]="userInput()" 
              (ngModelChange)="userInput.set($event)"
              (keyup.enter)="sendMessage()"
              placeholder="Type a message..." 
              class="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 px-2"
            />
            
            <button 
              (click)="sendMessage()" 
              [disabled]="!userInput().trim() || loading()"
              class="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-full transition-all transform active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <div class="text-center mt-2">
             <p class="text-[10px] text-gray-600">Powered by Gemini 2.0 Flash & Angular 21</p>
          </div>
        </div>

      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background-color: rgba(75, 85, 99, 0.5);
      border-radius: 20px;
    }
  `,
})
export class App {
  @ViewChild(SidebarComponent) public sidebar!: SidebarComponent;
  protected title = 'frontend';
  userInput = signal('');
  messages = signal<{ role: 'user' | 'ai', text: string, audioData?: string, mimeType?: string }[]>([]);
  loading = signal(false);
  sessionId = Math.random().toString(36).substring(7);

  private apollo = inject(Apollo); 

  @ViewChild(AudioRecorderComponent) audioRecorder!: AudioRecorderComponent;
  isLiveMode = signal(false);
  isPlaying = signal(false);

  onNewChat() {
    this.messages.set([]);
    this.sessionId = crypto.randomUUID();
    // Could also reset live mode if needed
  }

  toggleLiveMode() {
    this.isLiveMode.update(v => !v);
    if (this.isLiveMode()) {
      // Start the conversation loop
      this.audioRecorder.startRecording();
    } else {
      this.audioRecorder.stopRecording();
    }
  }

  sendMessage() {
    if (!this.userInput().trim()) return;

    const content = this.userInput();
    this.messages.update(msgs => [...msgs, { role: 'user', text: content }]);
    this.userInput.set('');
    this.loading.set(true);

    this.apollo.mutate({
      mutation: CHAT_MUTATION,
      variables: { content, sessionId: this.sessionId },
    }).subscribe({
      next: (result: any) => {
        this.loading.set(false);
        this.handleResponse(result);
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Error sending message', error);
        this.messages.update(msgs => [...msgs, { role: 'ai', text: 'Error: Could not connect to AI.' }]);
      }
    });
  }

  handleAudioRecorded(event: { base64: string }) {
    this.messages.update(msgs => [...msgs, { role: 'user', text: '🎤 [Audio Message]' }]);
    this.loading.set(true);

    this.apollo.mutate({
      mutation: CHAT_MUTATION,
      variables: { 
        content: '', 
        sessionId: this.sessionId,
        audioData: event.base64,
        mimeType: 'audio/webm' 
      },
    }).subscribe({
      next: (result: any) => {
        this.loading.set(false);
        this.handleResponse(result);
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Error sending audio', error);
        this.messages.update(msgs => [...msgs, { role: 'ai', text: 'Error: Could not send audio.' }]);
        
        // If error in live mode, maybe stop or retry? For now, let's stop to avoid loops
        if (this.isLiveMode()) {
             this.isLiveMode.set(false);
        }
      }
    });
  }

  private handleResponse(result: any) {
    const chat = result.data?.chat;
    if (chat?.text) {
      this.messages.update(msgs => [...msgs, { 
        role: 'ai', 
        text: chat.text,
        audioData: chat.audioData,
        mimeType: chat.mimeType
      }]);

      if (chat.audioData) {
        this.playAudio(chat.audioData, chat.mimeType);
      } else if (this.isLiveMode()) {
        // If no audio but in live mode, start recording anyway (maybe text response only)
        // Give user some time to read
        setTimeout(() => {
             this.audioRecorder.startRecording();
        }, 2000);
      }
    }
  }

  async playAudio(base64Data: string, mimeType = 'audio/mp3') {
    if (this.isPlaying()) return;
    this.isPlaying.set(true);
    
    console.log('=== Audio Playback Debug ===');
    console.log('MIME type:', mimeType);
    
    try {
      const cleanBase64 = base64Data.replace(/[\n\r\s]/g, '');
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      let audioBuffer: AudioBuffer;

      // Handle Raw PCM (audio/L16)
      if (mimeType.includes('audio/L16') || mimeType.includes('pcm')) {
        console.log('Detected Raw PCM (L16). Decoding manually...');
        
        // Extract sample rate from MIME type or default to 24000 (Gemini default)
        const rateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
        
        // Convert Uint8Array to Int16Array (L16 is 16-bit signed integers)
        // We need to ensure the byte array is aligned
        const int16Array = new Int16Array(byteArray.buffer);
        
        // Create AudioBuffer (1 channel for now)
        audioBuffer = audioContext.createBuffer(1, int16Array.length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
        for (let i = 0; i < int16Array.length; i++) {
          channelData[i] = int16Array[i] / 32768.0;
        }
        console.log(`PCM Decoded. Samples: ${int16Array.length}, Rate: ${sampleRate}`);
      } else {
        // Standard decoding for MP3/WAV
        console.log('Attempting standard decodeAudioData...');
        audioBuffer = await audioContext.decodeAudioData(byteArray.buffer);
      }
      
      console.log('Audio ready to play. Duration:', audioBuffer.duration);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        this.isPlaying.set(false);
        if (this.isLiveMode()) {
            this.audioRecorder.startRecording();
        }
      };
      
      source.start(0);
    } catch (e) {
      console.error('Audio playback failed:', e);
      console.error('Error details:', {
        name: (e as Error).name,
        message: (e as Error).message,
        stack: (e as Error).stack
      });
      this.isPlaying.set(false);
      if (this.isLiveMode()) {
           this.isLiveMode.set(false);
      }
    }
  }
}
