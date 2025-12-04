import {
  Component,
  input,
  output,
  effect,
  viewChild,
  ElementRef,
  signal,
  computed,
} from '@angular/core';
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
      @if (showVoiceControl()) {
      <div
        class="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md px-4 transition-all duration-300 ease-in-out"
      >
        <app-voice-control
          [currentTime]="currentAudioTime()"
          [totalDuration]="totalAudioDuration()"
          (stopped)="onStopAudio()"
        >
        </app-voice-control>
      </div>
      }

      <div
        class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        #scrollContainer
        (scroll)="onScroll()"
      >
        @if (showVoiceControl()) {
        <div class="h-16"></div>
        } @if (messages().length === 0 && !loading()) {
        <div
          class="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 w-auto opacity-50 select-none"
        >
          <div
            class="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 animate-pulse"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-12 h-12 text-gray-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-300 mb-2">
            {{ welcomeMessage().title }}
          </h3>
          <p class="text-gray-500 max-w-xs">{{ welcomeMessage().subtitle }}</p>
        </div>
        } @for (message of messages(); track $index) {
        <app-message-item
          [message]="message"
          [isPlaying]="isPlaying() && playingMessageIndex() === $index"
          (play)="onPlayMessage($index, message.text)"
          (stop)="onStopAudio()"
        >
        </app-message-item>
        } @if (loading()) {
        <div class="flex justify-start animate-pulse">
          <div
            class="bg-gray-800/50 backdrop-blur-sm rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 border border-gray-700/50"
          >
            <div class="flex gap-1.5">
              <div
                class="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style="animation-delay: 0ms"
              ></div>
              <div
                class="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                style="animation-delay: 150ms"
              ></div>
              <div
                class="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
                style="animation-delay: 300ms"
              ></div>
            </div>
          </div>
        </div>
        }

        <div class="h-4"></div>
      </div>

      @if (showScrollButton()) {
      <button
        (click)="scrollToBottom()"
        class="absolute bottom-6 right-6 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/30 transition-all transform hover:scale-110 active:scale-95 z-10 flex items-center justify-center group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="w-5 h-5 group-hover:animate-bounce"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
          />
        </svg>
        @if (hasNewMessages()) {
        <span
          class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900"
        ></span>
        }
      </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        overflow: hidden;
      }
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
    `,
  ],
})
export class ChatContainerComponent {
  messages = input<Message[]>([]);
  loading = input(false);
  isPlaying = input(false);
  showVoiceControl = input(false);
  currentAudioTime = input(0);
  totalAudioDuration = input(0);
  playingMessageIndex = input<number | null>(null);
  learningLanguage = input('en');

  welcomeMessages: Record<string, { title: string; subtitle: string }> = {
    en: {
      title: 'Conversation Room',
      subtitle: 'Start chatting to practice English!',
    },
    fr: {
      title: 'Salle de Conversation',
      subtitle: 'Commencez à discuter pour pratiquer le Français !',
    },
    es: {
      title: 'Sala de Conversación',
      subtitle: '¡Empieza a chatear para practicar Español!',
    },
    de: {
      title: 'Konversationsraum',
      subtitle: 'Fangen Sie an zu chatten, um Deutsch zu üben!',
    },
    it: {
      title: 'Sala di Conversazione',
      subtitle: "Inizia a chattare per praticare l'Italiano!",
    },
    ja: {
      title: '会話ルーム',
      subtitle: 'チャットを始めて日本語を練習しましょう！',
    },
  };

  welcomeMessage = computed(() => {
    const lang = this.learningLanguage().toLowerCase();
    const shortLang = lang.split('-')[0];
    return this.welcomeMessages[shortLang] || this.welcomeMessages['en'];
  });

  playAudio = output<{ index: number; text: string }>();
  stopAudio = output<void>();

  scrollContainer = viewChild<ElementRef>('scrollContainer');

  showScrollButton = signal(false);
  hasNewMessages = signal(false);
  private isUserScrolling = false;

  constructor() {
    effect(() => {
      const messages = this.messages();
      const container = this.scrollContainer();

      if (messages.length > 0 && container) {
        if (!this.isUserScrolling) {
          setTimeout(() => this.scrollToBottom(), 100);
        } else {
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
