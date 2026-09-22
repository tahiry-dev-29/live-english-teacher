import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import {
  LucideKeyRound,
  LucideMessageCircle,
  LucidePanelLeftOpen,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { MESSAGES } from '@core/constants/messages';
import { CallInterfaceComponent } from '@features/voice-call/call-interface/call-interface.component';
import { SidebarComponent } from '@core/components/sidebar/sidebar-component';
import { SettingsDialogComponent } from '@features/settings/settings-dialog-component';
import { ToastComponent } from '@core/components/toast/toast.component';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { ChatContainerComponent } from '../chat-container/chat-container.component';
import { LanguageService } from '@features/settings/services/language.service';
import { NotificationService } from '@core/services/notification.service';
import { TtsService } from '@features/tts-voice/services/tts.service';
import { ChatService } from '../services/chat.service';
import { MessageService } from '../services/message.service';
import { VoiceCallService } from '@features/voice-call/services/voice-call.service';
import { ChatPageState } from './chat-page.state';
import { ChatSendService } from './chat-send.service';
import { ChatVoiceService } from './chat-voice.service';
import { ChatSessionService } from './chat-session.service';
import { ChatInitService } from './chat-init.service';

/**
 * Chat page coordinator (Task 92 split): route wiring + delegation only.
 * State lives in ChatPageState, side effects in ChatSend/ChatVoice services.
 */
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
  providers: [
    ChatPageState,
    ChatSendService,
    ChatVoiceService,
    ChatSessionService,
    ChatInitService,
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.css',
})
export class ChatPageComponent implements OnInit {
  private readonly state = inject(ChatPageState);
  private readonly send = inject(ChatSendService);
  protected readonly voice = inject(ChatVoiceService);
  private readonly session = inject(ChatSessionService);
  private readonly init = inject(ChatInitService);

  private readonly router = inject(Router);

  protected readonly chatService = inject(ChatService);
  protected readonly messageService = inject(MessageService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly ttsService = inject(TtsService);
  protected readonly voiceCallService = inject(VoiceCallService);
  protected readonly languageService = inject(LanguageService);

  readonly sessions = this.state.sessions;
  readonly messages = this.state.messages;
  readonly loading = this.state.loading;
  readonly streaming = this.state.streaming;
  readonly isLiveMode = this.state.isLiveMode;
  readonly showSettings = this.state.showSettings;
  readonly userInput = this.state.userInput;
  readonly showVoiceControl = this.state.showVoiceControl;
  readonly playingMessageIndex = this.state.playingMessageIndex;
  readonly vocalEnabled = this.state.vocalEnabled;
  readonly isAudioRecording = this.state.isAudioRecording;
  readonly isShared = this.state.isShared;
  readonly isSessionLoading = this.state.isSessionLoading;
  readonly quotaBannerTitle = this.state.quotaBannerTitle;
  readonly quotaBannerBody = this.state.quotaBannerBody;
  readonly quotaBannerAction = this.state.quotaBannerAction;
  readonly currentSession = this.state.currentSession;

  get sessionId(): string | null {
    return this.state.sessionId;
  }

  ngOnInit(): void {
    this.init.start();
  }

  toggleLiveMode(): void {
    if (this.isLiveMode()) {
      this.voiceCallService.stopCall();
      this.isLiveMode.set(false);
      return;
    }
    this.isLiveMode.set(true);
    this.voiceCallService
      .startCall({
        language: this.languageService.selectedLanguageCode(),
        onTranscriptReady: (text: string) =>
          void this.send.sendText(text, this.voice.speakOptions),
        onInactivity: () => this.voice.promptInactivity(),
      })
      .catch(() => {
        this.isLiveMode.set(false);
        this.notificationService.warning(MESSAGES.error.microphoneAccessDenied);
      });
  }

  toggleVocal(): void {
    if (this.ttsService.isPlaying()) this.ttsService.stop();
  }

  onLanguageChange(code: string): void {
    this.languageService.setLanguage(code);
  }

  /** Opens Settings dialog and immediately switches to the AI Model / keys tab. */
  openSettingsOnApiTab(): void {
    this.showSettings.set(true);
  }

  onNewChat(): void {
    this.session.onNewChat();
  }

  loadSession(sessionId: string): void {
    this.session.loadSession(sessionId);
  }

  onRenameSession(event: { id: string; title: string }): void {
    this.session.rename(event.id, event.title);
  }

  onTogglePinSession(event: { id: string; isPinned: boolean }): void {
    this.session.togglePin(event.id, event.isPinned);
  }

  onDeleteSession(sessionId: string): Promise<void> {
    return this.session.delete(sessionId);
  }

  async sendMessage(): Promise<void> {
    const text = this.userInput();
    this.userInput.set('');
    await this.send.sendText(text, this.voice.speakOptions);
  }

  async handleAudioRecorded(event: { base64: string }): Promise<void> {
    await this.send.sendAudio(
      event.base64,
      'audio/webm',
      this.voice.speakOptions,
    );
  }

  onRetryMessage(index: number): void {
    this.send.retryFrom(index, this.voice.speakOptions);
  }

  onForkSession(index: number): void {
    this.send.forkFrom(index);
  }

  protected dismissQuotaAlert(): void {
    this.voice.dismissQuota();
    this.notificationService.warning(MESSAGES.warning.quotaBannerBody);
  }
}
