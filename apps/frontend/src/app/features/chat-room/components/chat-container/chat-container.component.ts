import {
  Component,
  input,
  output,
  viewChild,
  ElementRef,
  signal,
  computed,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  Renderer2,
  effect,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { LucideArrowDown } from '@lucide/angular';
import { MessageItemComponent } from '../message-item/message-item.component';
import { VoiceControlComponent } from '@core/components/voice-control/voice-control-component';
import { ChatWelcomeComponent } from './chat-welcome.component';
import { ChatMessage } from '@models/chat-message.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-container',
  standalone: true,
  imports: [
    LucideArrowDown,
    MessageItemComponent,
    VoiceControlComponent,
    ChatWelcomeComponent,
  ],
  templateUrl: './chat-container.component.html',
  styleUrl: './chat-container.component.css',
})
export class ChatContainerComponent implements AfterViewInit, OnDestroy {
  readonly messages = input<ChatMessage[]>([]);
  readonly loading = input<boolean>(false);
  readonly isPlaying = input<boolean>(false);
  readonly showVoiceControl = input<boolean>(false);
  readonly currentAudioTime = input<number>(0);
  readonly totalAudioDuration = input<number>(0);
  readonly playingMessageIndex = input<number | null>(null);
  readonly learningLanguage = input<string>('en');

  readonly playAudio = output<{ text: string; index: number }>();
  readonly stop = output<void>();
  readonly pauseAudio = output<void>();
  readonly resumeAudio = output<void>();
  readonly seekAudio = output<number>();
  readonly retryMessage = output<number>();
  readonly forkSession = output<number>();

  readonly scrollContainer = viewChild<ElementRef>('scrollContainer');

  readonly showScrollButton = signal<boolean>(false);
  readonly hasNewMessages = signal<boolean>(false);
  readonly autoScroll = signal<boolean>(true);

  private scrollObserver?: IntersectionObserver;
  private readonly documentRef = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);

  constructor() {
    effect(() => {
      const msgs = this.messages();
      const isLoading = this.loading();
      const el = this.scrollContainer()?.nativeElement as
        HTMLElement | undefined;
      if (!el || typeof requestAnimationFrame === 'undefined') return;
      if (msgs.length === 0 && !isLoading) return;
      if (!this.autoScroll()) return;
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
      });
    });
  }

  readonly lastAiMessageIndex = computed<number | null>(() => {
    const msgs = this.messages();
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'ai') return i;
    }
    return null;
  });

  readonly hasAiMessage = computed<boolean>(
    () => this.lastAiMessageIndex() !== null,
  );

  ngAfterViewInit(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;

    const sentinel = this.documentRef.createElement('div');
    this.renderer.addClass(sentinel, 'scroll-sentinel');
    this.renderer.setStyle(sentinel, 'height', '1px');
    this.renderer.appendChild(el, sentinel);

    this.scrollObserver = new IntersectionObserver(
      ([entry]) => {
        this.hasNewMessages.set(!entry.isIntersecting);
      },
      { root: el, threshold: 0.1 },
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
    this.autoScroll.set(atBottom);
    if (atBottom) {
      this.hasNewMessages.set(false);
    }
  }

  scrollToBottom(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      this.autoScroll.set(true);
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

  async copyLastMessage(): Promise<void> {
    const idx = this.lastAiMessageIndex();
    if (idx === null || idx === undefined) return;
    const message = this.messages()[idx];
    if (!message?.text) return;

    // Best practice: Async Clipboard API (secure context). No deprecated execCommand.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.text);
        return;
      }
      throw new Error('Clipboard API unavailable');
    } catch {
    // Fallback without deprecated API: select text for manual copy (Ctrl/Cmd+C),
    // then clean up. No document.execCommand here.
      const textarea = this.documentRef.createElement(
        'textarea',
      ) as HTMLTextAreaElement;
      textarea.value = message.text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      this.renderer.appendChild(this.documentRef.body, textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      this.renderer.removeChild(this.documentRef.body, textarea);
    }
  }

  retryLastMessage(): void {
    const idx = this.lastAiMessageIndex();
    if (idx === null) return;
    // Find the user message before this AI message
    for (let i = idx - 1; i >= 0; i--) {
      if (this.messages()[i].role === 'user') {
        this.retryMessage.emit(i);
        return;
      }
    }
  }

  listenLastMessage(): void {
    const idx = this.lastAiMessageIndex();
    if (idx === null) return;
    this.playAudio.emit({
      text: this.messages()[idx]?.text ?? '',
      index: idx,
    });
  }

  forkLastSession(): void {
    const idx = this.lastAiMessageIndex();
    if (idx === null) return;
    this.forkSession.emit(idx);
  }
}
