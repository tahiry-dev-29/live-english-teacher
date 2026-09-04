import {
  Component,
  input,
  output,
  viewChild,
  ElementRef,
  signal,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideArrowDown } from '@lucide/angular';
import { MessageItemComponent } from '../message-item/message-item.component';
import { VoiceControlComponent } from '@core/components/voice-control/voice-control-component';
import { ChatWelcomeComponent } from './chat-welcome.component';

export interface Message {
  role: 'user' | 'ai';
  text: string;
}

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [
    CommonModule,
    LucideArrowDown,
    MessageItemComponent,
    VoiceControlComponent,
    ChatWelcomeComponent,
  ],
  templateUrl: './chat-container.component.html',
  styleUrl: './chat-container.component.css',
})
export class ChatContainerComponent implements AfterViewInit, OnDestroy {
  messages = input<Message[]>([]);
  loading = input(false);
  isPlaying = input(false);
  showVoiceControl = input(false);
  currentAudioTime = input(0);
  totalAudioDuration = input(0);
  playingMessageIndex = input<number | null>(null);
  learningLanguage = input('en');

  playAudio = output<{ text: string; index: number }>();
  stop = output<void>();

  readonly scrollContainer = viewChild<ElementRef>('scrollContainer');

  showScrollButton = signal(false);
  hasNewMessages = signal(false);

  private scrollObserver?: IntersectionObserver;

  ngAfterViewInit(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;

    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    sentinel.style.height = '1px';
    el.appendChild(sentinel);

    this.scrollObserver = new IntersectionObserver(
      ([entry]) => {
        this.hasNewMessages.set(!entry.isIntersecting);
      },
      { root: el, threshold: 0.1 }
    );
    this.scrollObserver.observe(sentinel);
  }

  ngOnDestroy(): void {
    this.scrollObserver?.disconnect();
  }

  onScroll(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    this.showScrollButton.set(!atBottom);
    if (atBottom) {
      this.hasNewMessages.set(false);
    }
  }

  scrollToBottom(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      this.hasNewMessages.set(false);
    }
  }

  onStopAudio(): void {
    this.stop.emit();
  }

  onPlayMessage(index: number, text: string): void {
    this.playAudio.emit({ text, index });
  }
}
