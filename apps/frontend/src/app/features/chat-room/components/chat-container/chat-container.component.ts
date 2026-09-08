import { Component, input, output, viewChild, ElementRef, signal, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly messages = input<Message[]>([]);
  readonly loading = input<boolean>(false);
  readonly isPlaying = input<boolean>(false);
  readonly showVoiceControl = input<boolean>(false);
  readonly currentAudioTime = input<number>(0);
  readonly totalAudioDuration = input<number>(0);
  readonly playingMessageIndex = input<number | null>(null);
  readonly learningLanguage = input<string>('en');

  readonly playAudio = output<{ text: string; index: number }>();
  readonly stop = output<void>();

  readonly scrollContainer = viewChild<ElementRef>('scrollContainer');

  readonly showScrollButton = signal<boolean>(false);
  readonly hasNewMessages = signal<boolean>(false);

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
