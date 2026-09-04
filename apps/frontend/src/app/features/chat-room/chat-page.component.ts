import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  signal,
  viewChild,
  OnInit,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LucideMessageCircle, LucidePanelRightOpen } from '@lucide/angular';
import { CallInterfaceComponent } from '@core/components/call-interface/call-interface.component';
import { ChatInputComponent } from '@core/components/chat-input/chat-input.component';
import { SidebarComponent } from '@core/components/sidebar/sidebar-component';
import { SettingsDialogComponent } from '@core/components/settings-dialog/settings-dialog-component';
import { ChatService } from '@core/services/chat.service';
import { MessageService } from '@core/services/message.service';
import { TtsService } from '@core/services/tts.service';
import { VoiceCallService } from '@core/services/voice-call.service';
import { LanguageService } from '@core/services/language.service';
import { ChatContainerComponent } from './components/chat-container/chat-container.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    RouterModule,
    FormsModule,
    CommonModule,
    LucideMessageCircle,
    LucidePanelRightOpen,
    SidebarComponent,
    CallInterfaceComponent,
    ChatInputComponent,
    ChatContainerComponent,
    SettingsDialogComponent,
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.css',
})
export class ChatPageComponent implements OnInit {
  readonly sidebar = viewChild<SidebarComponent>('sidebar');

  protected chatService = inject(ChatService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected messageService = inject(MessageService);
  protected ttsService = inject(TtsService);
  protected voiceCallService = inject(VoiceCallService);
  protected languageService = inject(LanguageService);

  sessions = this.chatService.sessions;
  messages = this.messageService.messages;
  loading = this.messageService.loading;

  isLiveMode = signal(false);
  showSettings = signal(false);
  userInput = signal('');
  showVoiceControl = signal(false);
  playingMessageIndex = signal<number | null>(null);
  vocalEnabled = signal(false);
  isAudioRecording = signal(false);

  currentSession = computed(() => {
    const id = this.chatService.activeSessionId();
    const list = this.sessions();
    if (!id || !list) return null;
    return list.find((s) => s.id === id) ?? null;
  });

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const sessionId = params['sessionId'];
      if (sessionId) {
        this.loadSession(sessionId);
      }
    });
  }

  get sessionId(): string {
    return this.chatService.activeSessionId() || crypto.randomUUID();
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
              this.languageService.selectedLanguageCode()
            );
            if (result) {
              this.chatService.activeSessionId.set(result.sessionId);
              this.chatService.sessionsResource.reload();
              this.router.navigate(['/chat', result.sessionId]);
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
          console.error('Failed to start voice call:', err);
          this.isLiveMode.set(false);
          alert(
            'Could not access microphone. Please check your browser permissions.'
          );
        });
    }
  }

  toggleVocal(): void {
    if (this.ttsService.isPlaying()) {
      this.ttsService.stop();
    }
  }

  onNewChat(): void {
    const newId = this.chatService.createNewSession();
    this.router.navigate(['/chat', newId]);
    this.userInput.set('');
  }

  loadSession(sessionId: string): void {
    this.chatService.loadSession(sessionId);
    this.userInput.set('');
  }

  onRenameSession(event: { id: string; title: string }): void {
    this.chatService.renameSession(event.id, event.title);
  }

  onDeleteSession(sessionId: string): void {
    this.chatService.deleteSession(sessionId);
  }

  async sendMessage(): Promise<void> {
    const text = this.userInput().trim();
    if (!text) return;

    this.userInput.set('');

    const result = await this.messageService.sendTextMessage(
      text,
      this.sessionId,
      this.languageService.selectedLanguageCode()
    );

    if (result) {
      this.chatService.activeSessionId.set(result.sessionId);
      this.chatService.sessionsResource.reload();
      this.router.navigate(['/chat', result.sessionId]);

      if (this.isLiveMode()) {
        this.speakText(result.text);
      }
    }
  }

  async handleAudioRecorded(event: { base64: string }): Promise<void> {
    const result = await this.messageService.sendAudioMessage(
      event.base64,
      'audio/webm',
      this.sessionId,
      this.languageService.selectedLanguageCode()
    );

    if (result) {
      this.chatService.activeSessionId.set(result.sessionId);
      this.chatService.sessionsResource.reload();
      this.router.navigate(['/chat', result.sessionId]);

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

  handleRecordingStateChange(isRecording: boolean): void {
    this.isAudioRecording.set(isRecording);
  }

  private speakText(text: string): void {
    this.vocalEnabled.set(true);
    this.showVoiceControl.set(true);

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
    const fallbackMessage = "I can't hear you. Are you still there?";
    this.messageService.addMessage({ role: 'ai', text: fallbackMessage });
    this.speakText(fallbackMessage);
  }
}
