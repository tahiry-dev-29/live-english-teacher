import { Component, input, output, effect, viewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageItemComponent } from '../message-item/message-item.component';
import { VoiceControlComponent } from '../../../../core/components/voice-control/voice-control-component';

export interface Message {
  role: 'user' | 'ai';
  text: string;
}

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [CommonModule, MessageItemComponent, VoiceControlComponent],
  template: `
    <div class="relative h-full flex flex-col">
      
      <!-- Sticky Voice Control (Top Center) -->
      @if (showVoiceControl()) {
        <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md px-4 transition-all duration-300 ease-in-out">
          <app-voice-control
            [currentTime]="currentAudioTime()"
            [totalDuration]="totalAudioDuration()"
            (stopped)="onStopAudio()">
          </app-voice-control>
        </div>
      }

      <!-- Scrollable Message Area -->
      <div 
        class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" 
        #scrollContainer
        (scroll)="onScroll()">
        
        <!-- Spacer for Voice Control -->
        @if (showVoiceControl()) {
          <div class="h-16"></div>
        }

        <!-- Messages -->
        @for (message of messages(); track $index) {
          <app-message-item
            [message]="message"
            [isPlaying]="isPlaying() && playingMessageIndex() === $index"
            (play)="onPlayMessage($index, message.text)"
            (stop)="onStopAudio()">
          </app-message-item>
        }

        <!-- Loading Indicator -->
        @if (loading()) {
          <div class="flex justify-start animate-pulse">
            <div class="bg-gray-800/50 backdrop-blur-sm rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 border border-gray-700/50">
              <div class="flex gap-1.5">
                <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                <div class="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
              </div>
            </div>
          </div>
        }
        
        <!-- Bottom Spacer -->
        <div class="h-4"></div>
      </div>

      <!-- Scroll to Bottom Button -->
      @if (showScrollButton()) {
        <button 
          (click)="scrollToBottom()"
          class="absolute bottom-6 right-6 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/30 transition-all transform hover:scale-110 active:scale-95 z-10 flex items-center justify-center group">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 group-hover:animate-bounce">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
          </svg>
          @if (hasNewMessages()) {
            <span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900"></span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }
    
    /* Custom Scrollbar */
    .overflow-y-auto::-webkit-scrollbar {
      width: 6px;
    }
    .overflow-y-auto::-webkit-scrollbar-track {
      background: transparent;
    }
    .overflow-y-auto::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class ChatContainerComponent {
  // Inputs
  messages = input<Message[]>([]);
  loading = input(false);
  isPlaying = input(false);
  showVoiceControl = input(false);
  currentAudioTime = input(0);
  totalAudioDuration = input(0);
  playingMessageIndex = input<number | null>(null);

  // Outputs
  playAudio = output<{ index: number; text: string }>();
  stopAudio = output<void>();

  // View child
  scrollContainer = viewChild<ElementRef>('scrollContainer');

  // State
  showScrollButton = signal(false);
  hasNewMessages = signal(false);
  private isUserScrolling = false;

  constructor() {
    // Auto-scroll logic
    effect(() => {
      const messages = this.messages();
      const container = this.scrollContainer();
      
      if (messages.length > 0 && container) {
        // If user is not scrolling or is near bottom, auto-scroll
        if (!this.isUserScrolling) {
          setTimeout(() => this.scrollToBottom(), 100);
        } else {
          // Otherwise show notification dot
          this.hasNewMessages.set(true);
        }
      }
    });
  }

  onScroll() {
    const container = this.scrollContainer()?.nativeElement;
    if (!container) return;

    const threshold = 100;
    const position = container.scrollTop + container.clientHeight;
    const height = container.scrollHeight;
    
    // Check if user is near bottom
    const isNearBottom = height - position < threshold;
    
    this.showScrollButton.set(!isNearBottom);
    this.isUserScrolling = !isNearBottom;
    
    if (isNearBottom) {
      this.hasNewMessages.set(false);
    }
  }

  scrollToBottom() {
    const container = this.scrollContainer()?.nativeElement;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      this.showScrollButton.set(false);
      this.hasNewMessages.set(false);
      this.isUserScrolling = false;
    }
  }

  onPlayMessage(index: number, text: string) {
    this.playAudio.emit({ index, text });
  }

  onStopAudio() {
    this.stopAudio.emit();
  }
}
