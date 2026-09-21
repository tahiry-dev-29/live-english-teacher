import {
  Component,
  inject,
  signal,
  viewChild,
  OnInit,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  LucideKeyRound,
  LucideMessageCircle,
  LucidePanelLeftOpen,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { MESSAGES, MESSAGE_TEMPLATES } from '@core/constants/messages';
import { CallInterfaceComponent } from '@core/components/call-interface/call-interface.component';
import { ChatInputComponent } from '@core/components/chat-input/chat-input.component';
import { SidebarComponent } from '@core/components/sidebar/sidebar-component';
import { SettingsDialogComponent } from '@core/components/settings-dialog/settings-dialog-component';
import { ToastComponent } from '@core/components/toast/toast.component';
import { NotificationService } from '@core/services/notification.service';
import { ChatService } from '@core/services/chat.service';
import { MessageService } from '@core/services/message.service';
import { TtsService } from '@core/services/tts.service';
import { VoiceCallService } from '@core/services/voice-call.service';
import { LanguageService } from '@core/services/language.service';
import { ChatContainerComponent } from './components/chat-container/chat-container.component';

function generateChatTitle(text: string): string {
  if (!text) return 'New Chat';
  let title = text.replace(/[\r\n]+/g, ' ').trim();
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  return title || 'New Chat';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    RouterModule,
    LucideMessageCircle,
    LucidePanelLeftOpen,
    LucideTriangleAlert,
    LucideKeyRound,
    LucideX,
    SidebarComponent,
    SettingsDialogComponent,
    CallInterfaceComponent,
    ChatInputComponent,
    ChatContainerComponent,
    ToastComponent,
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.css',
})
export class ChatPageComponent implements OnInit {
  readonly sidebar = viewChild<SidebarComponent>('sidebar');

  protected readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly messageService = inject(MessageService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly ttsService = inject(TtsService);
  protected readonly voiceCallService = inject(VoiceCallService);
  protected readonly languageService = inject(LanguageService);

  readonly sessions = this.chatService.sessions;
  readonly messages = this.messageService.messages;
  readonly loading = this.messageService.loading;

  readonly isLiveMode = signal<boolean>(false);
  readonly showSettings = signal<boolean>(false);
  readonly settingsInitialTab = signal<
    'general' | 'ai_model' | 'voices' | 'language'
  >('general');
  readonly userInput = signal<string>('');
  readonly showVoiceControl = signal<boolean>(false);
  readonly playingMessageIndex = signal<number | null>(null);
  readonly vocalEnabled = signal<boolean>(false);
  readonly isAudioRecording = signal<boolean>(false);
  readonly isShared = signal<boolean>(false);

  /**
   * True while the session's messages are being fetched from the server.
   * Uses the resource's own isLoading() so it stays true for the full
   * duration of the network round-trip (resource.reload() is not async).
   */
  readonly isSessionLoading = computed(
    () =>
      this.messageService.messagesResource.isLoading() ||
      this.messageService.loading(),
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

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const sessionId = params['sessionId'] as string | undefined;
        this.isShared.set(this.router.url.startsWith('/share/'));

        if (sessionId) {
          // Route is the single source of truth — always load from params.
          // This handles both direct URL navigation AND sidebar clicks
          // (sidebar click → router.navigate → params fires here).
          this.chatService.activeSessionId.set(sessionId);
          void this.messageService.loadSessionMessages(sessionId);
          this.userInput.set('');
        } else {
          // "new chat" state: no id yet — backend generates it on first message.
          this.chatService.createNewSession();
          this.userInput.set('');
        }
      });

    // Defer the first session-list fetch so the UI renders first.
    // setTimeout(..., 0) yields to the browser's paint cycle before hitting the API.
    setTimeout(() => {
      this.chatService.loadSessions();
    }, 0);
  }

  /** Existing session or null for "new chat" (id managed by the backend). */
  get sessionId(): string | null {
    return this.chatService.activeSessionId();
  }

  toggleLiveMode(): void {
    if (this.isLiveMode()) {
      this.voiceCallService.stopCall();
      this.isLiveMode.set(false);
    } else {
      this.isLiveMode.set(true);
      this.voiceCallService
        .startCall({
          language: this.languageService.selectedLanguageCode(),
          onTranscriptReady: async (text: string) => {
            const result = await this.messageService.sendTextMessage(
              text,
              this.sessionId,
              this.languageService.selectedLanguageCode(),
            );
            if (result?.sessionId) {
              this.chatService.activeSessionId.set(result.sessionId);
              this.chatService.sessionsResource.reload();
              this.router.navigate(['/chat', result.sessionId]);
              this.speakText(result.text);
            } else if (result) {
              this.speakText(result.text);
            } else {
              this.voiceCallService.finishSpeaking();
            }
          },
          onInactivity: () => {
            this.handleInactivity();
          },
        })
        .catch((err) => {
          console.error(MESSAGES.log.voiceCallUiStartFailed, err);
          this.isLiveMode.set(false);
          alert(MESSAGES.error.microphoneAccessDenied);
        });
    }
  }

  toggleVocal(): void {
    if (this.ttsService.isPlaying()) {
      this.ttsService.stop();
    }
  }

  onLanguageChange(code: string): void {
    this.languageService.setLanguage(code);
  }

  onNewChat(): void {
    // No id generated here: the backend creates the session on the first message.
    this.chatService.createNewSession();
    this.router.navigate(['/']);
  }

  /** Opens Settings dialog and immediately switches to the AI Model / keys tab. */
  openSettingsOnApiTab(): void {
    this.showSettings.set(true);
  }

  /**
   * Called when a session is selected from the sidebar.
   * Just navigates — the route params subscription handles the actual load.
   * This avoids double-loading (params fires once, data is fetched once).
   */
  loadSession(sessionId: string): void {
    if (this.isShared()) {
      // In shared-view mode, no navigation — load directly.
      this.chatService.activeSessionId.set(sessionId);
      void this.messageService.loadSessionMessages(sessionId);
      this.userInput.set('');
      return;
    }
    this.router.navigate(['/chat', sessionId]);
  }

  onRenameSession(event: { id: string; title: string }): void {
    this.chatService.renameSession(event.id, event.title);
  }

  onTogglePinSession(event: { id: string; isPinned: boolean }): void {
    this.chatService.togglePinSession(event.id, event.isPinned);
  }

  async onDeleteSession(sessionId: string): Promise<void> {
    try {
      await this.chatService.deleteSession(sessionId);
      this.notificationService.success('Conversation deleted');
      // If we delete the active session, return to "new chat" state (no id).
      if (this.chatService.activeSessionId() === sessionId) {
        this.chatService.createNewSession();
        this.router.navigate(['/']);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      this.notificationService.error('Failed to delete conversation');
    }
  }

  async sendMessage(): Promise<void> {
    const text = this.userInput().trim();
    if (!text) return;

    this.userInput.set('');
    const wasNewChat = this.sessionId === null;

    const result = await this.messageService.sendTextMessage(
      text,
      this.sessionId,
      this.languageService.selectedLanguageCode(),
    );

    if (result?.sessionId) {
      this.chatService.activeSessionId.set(result.sessionId);

      // Auto-title (task 82): fire-and-forget — renameSession() already
      // reloads the history once internally, navigation never waits for it.
      if (wasNewChat) {
        void this.chatService.renameSession(
          result.sessionId,
          generateChatTitle(text),
        );
      }

      this.router.navigate(['/chat', result.sessionId]);

      if (this.isLiveMode()) {
        this.speakText(result.text);
      }
    } else if (result) {
      // Error (e.g. no sessionId resolved): the error message is already
      // displayed in the thread, no navigation needed.
      if (this.isLiveMode()) {
        this.speakText(result.text);
      }
    }
  }

  async handleAudioRecorded(event: { base64: string }): Promise<void> {
    const wasNewChat = this.sessionId === null;
    const result = await this.messageService.sendAudioMessage(
      event.base64,
      'audio/webm',
      this.sessionId,
      this.languageService.selectedLanguageCode(),
    );

    if (result?.sessionId) {
      this.chatService.activeSessionId.set(result.sessionId);

      if (wasNewChat) {
        void this.chatService.renameSession(
          result.sessionId,
          generateChatTitle('Voice Message'),
        );
      }

      this.router.navigate(['/chat', result.sessionId]);

      if (this.isLiveMode()) {
        this.speakText(result.text);
      }
    } else if (result) {
      if (this.isLiveMode()) {
        this.speakText(result.text);
      }
    }
  }

  handlePlayAudio(event: { text: string; index: number }): void {
    this.playingMessageIndex.set(event.index);
    this.speakText(event.text);
  }

  handleStopAudio(): void {
    this.ttsService.stop();
    this.playingMessageIndex.set(null);
    this.showVoiceControl.set(false);
  }

  handlePauseAudio(): void {
    this.ttsService.pause();
  }

  handleResumeAudio(): void {
    this.ttsService.resume();
  }

  /** Play-button retry after a TTS API failure (task 84). */
  handleRetryAudio(): void {
    void this.ttsService.retryLast();
  }

  handleSeekAudio(seconds: number): void {
    this.ttsService.seekTo(seconds);
  }

  handleRecordingStateChange(isRecording: boolean): void {
    this.isAudioRecording.set(isRecording);
  }

  onRetryMessage(index: number): void {
    const msgs = this.messageService.messages();
    for (let i = index; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        const textToRetry = msgs[i].text;
        void this.messageService.sendTextMessage(
          textToRetry,
          this.sessionId,
          this.languageService.selectedLanguageCode(),
        );
        return;
      }
    }
  }

  async onForkSession(index: number): Promise<void> {
    const msgs = this.messageService.messages().slice(0, index + 1);
    this.chatService.createNewSession();
    this.messageService.clearMessages();
    for (const msg of msgs) {
      this.messageService.addMessage(msg);
    }
    this.router.navigate(['/']);
  }

  private speakText(text: string): void {
    this.vocalEnabled.set(true);

    if (!this.isLiveMode()) {
      this.showVoiceControl.set(true);
    }

    this.ttsService.speak(text, {
      voice: this.languageService.selectedVoice() || undefined,
      lang: this.languageService.selectedLanguageCode(),
      onEnd: () => {
        this.playingMessageIndex.set(null);

        if (this.isLiveMode()) {
          this.voiceCallService.finishSpeaking();
        } else {
          setTimeout(() => {
            this.showVoiceControl.set(false);
          }, 500);
        }
      },
      onError: () => {
        this.playingMessageIndex.set(null);

        if (this.isLiveMode()) {
          this.voiceCallService.finishSpeaking();
        }
      },
    });

    if (this.isLiveMode()) {
      this.voiceCallService.startSpeaking();
    }
  }

  private handleInactivity(): void {
    const fallbackMessage = MESSAGES.warning.inactivityPrompt;
    this.messageService.addMessage({ role: 'ai', text: fallbackMessage });
    this.speakText(fallbackMessage);
  }

  protected dismissQuotaAlert(): void {
    this.messageService.quotaExceeded.set(null);
    this.notificationService.warning(MESSAGES.warning.quotaBannerBody);
  }
}
