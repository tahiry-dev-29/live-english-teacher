/**
 * Chat page state (Task 92 split): signals + derived values only.
 * Provided at the chat-page component level, so each page instance
 * gets isolated state instead of sharing a root singleton.
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { MESSAGES, MESSAGE_TEMPLATES } from '@core/constants/messages';
import { ChatService } from '@features/chat/services/chat.service';
import { MessageService } from '@features/chat/services/message.service';

export type SettingsTab = 'general' | 'ai_model' | 'voices' | 'language';

@Injectable()
export class ChatPageState {
  private readonly chatService = inject(ChatService);
  private readonly messageService = inject(MessageService);

  readonly sessions = this.chatService.sessions;
  readonly messages = this.messageService.messages;
  readonly loading = this.messageService.loading;
  readonly streaming = this.messageService.streaming;

  readonly isLiveMode = signal<boolean>(false);
  readonly showSettings = signal<boolean>(false);
  readonly settingsInitialTab = signal<SettingsTab>('general');
  readonly userInput = signal<string>('');
  readonly showVoiceControl = signal<boolean>(false);
  readonly playingMessageIndex = signal<number | null>(null);
  readonly vocalEnabled = signal<boolean>(false);
  readonly isAudioRecording = signal<boolean>(false);
  readonly isShared = signal<boolean>(false);

  /**
   * True while the session's messages are being fetched from the server
   * (chat selection / reload / direct URL). Never true for message sending —
   * the send path has its own "Thinking…" / streaming states.
   */
  readonly isSessionLoading = computed(() =>
    this.messageService.messagesResource.isLoading(),
  );

  readonly quotaBannerTitle = computed<string>(() => {
    const provider = this.messageService.quotaExceeded();
    return provider ? MESSAGE_TEMPLATES.quotaBannerTitle(provider) : '';
  });
  readonly quotaBannerBody = MESSAGES.warning.quotaBannerBody;
  readonly quotaBannerAction = MESSAGES.warning.quotaBannerAction;

  readonly currentSession = computed(() => {
    const id = this.chatService.activeSessionId();
    const list = this.sessions();
    if (!id || !list) return null;
    return list.find((s) => s.id === id) ?? null;
  });

  /** Existing session id or null for "new chat" (created by the backend). */
  get sessionId(): string | null {
    return this.chatService.activeSessionId();
  }
}
