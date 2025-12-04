import { CommonModule } from '@angular/common';
import { Component, inject, signal, viewChild, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CallInterfaceComponent } from '../../core/components/call-interface/call-interface.component';
import { ChatInputComponent } from '../../core/components/chat-input/chat-input.component';
import { SidebarComponent } from '../../core/components/sidebar/sidebar-component';
import { SettingsDialogComponent } from '../../core/components/settings-dialog/settings-dialog-component';
import { ChatService } from '../../core/services/chat.service';
import { MessageService } from '../../core/services/message.service';
import { TtsService } from '../../core/services/tts.service';
import { VoiceCallService } from '../../core/services/voice-call.service';
import { LanguageService } from '../../core/services/language.service';
import { ChatContainerComponent } from './components/chat-container/chat-container.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    RouterModule, 
    FormsModule, 
    CommonModule, 
    SidebarComponent, 
    CallInterfaceComponent, 
    ChatInputComponent,
    ChatContainerComponent,
    SettingsDialogComponent
  ],
  template: `
    <div class="flex h-screen bg-gray-950 text-white overflow-hidden">
      
      @if (isLiveMode()) {
        <app-call-interface
          [callState]="voiceCallService.callState()"
          [transcript]="voiceCallService.currentTranscript()"
          (endCall)="toggleLiveMode()"
          (toggleMute)="toggleVocal()">
        </app-call-interface>
      }

      <app-sidebar 
        (newChat)="onNewChat()" 
        [sessions]="sessions() ?? []" 
        [activeSessionId]="chatService.activeSessionId()" 
        (sessionSelected)="loadSession($event)"
        (renameSession)="onRenameSession($event)"
        (deleteSession)="onDeleteSession($event)"
        (openSettings)="showSettings.set(true)"
        #sidebar>
      </app-sidebar>

      <app-settings-dialog
        [isOpen]="showSettings()"
        [languages]="languageService.languages"
        [voices]="languageService.availableVoices()"
        [selectedLanguage]="languageService.selectedLanguageCode()"
        [selectedVoiceName]="languageService.selectedVoice()?.name ?? ''"
        (closed)="showSettings.set(false)"
        (languageChange)="languageService.setLanguage($event)"
        (voiceChange)="languageService.setVoice($event)">
      </app-settings-dialog>

      <main class="flex-1 flex flex-col relative w-full h-full transition-all duration-300">
        
        <div class="md:hidden p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <button (click)="sidebar.toggle()" class="text-gray-400 hover:text-white">
            ☰
          </button>
          <span class="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Live Teacher</span>
          <div class="w-6"></div>
        </div>

        <div class="hidden md:flex bg-gray-950/ backdrop-blur-md p-4 items-center justify-between z-10">
          <div>
            <h1 class="text-xl font-bold tracking-wide text-white">
              {{ currentSession()?.title || 'Conversation Room' }}
            </h1>
          </div>
          <div class="flex gap-2">
            <button 
              (click)="toggleLiveMode()" 
              class="px-4 py-2 rounded-lg transition-all font-medium flex items-center gap-2 cursor-pointer"
              [class.bg-green-600]="isLiveMode()"
              [class.hover:bg-green-700]="isLiveMode()"
              [class.bg-purple-600]="!isLiveMode()"
              [class.hover:bg-purple-700]="!isLiveMode()">
              @if (isLiveMode()) {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                  <path fill-rule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clip-rule="evenodd" />
                </svg>
                <span>End Call</span>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                  <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                  <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                </svg>
                <span>Start Live Call</span>
              }
            </button>
          </div>
        </div>

        <app-chat-container
          [messages]="messages()"
          [loading]="loading()"
          [isPlaying]="ttsService.isPlaying()"
          [showVoiceControl]="showVoiceControl()"
          [currentAudioTime]="ttsService.currentAudioTime()"
          [totalAudioDuration]="ttsService.totalAudioDuration()"
          [playingMessageIndex]="playingMessageIndex()"
          [learningLanguage]="currentSession()?.learningLanguage || languageService.selectedLanguageCode()"
          (playAudio)="handlePlayAudio($event)"
          (stopAudio)="handleStopAudio()">
        </app-chat-container>

        <div class="p-4">
          <app-chat-input
            [value]="userInput()"
            [disabled]="loading()"
            [isLoading]="loading()"
            [isPlaying]="ttsService.isPlaying()"
            (valueChange)="userInput.set($event)"
            (messageSent)="sendMessage()"
            (audioRecorded)="handleAudioRecorded($event)"
            (stop)="handleStopAudio()">
          </app-chat-input>

          <div class="text-center mt-2">
            <p class="text-[10px] text-gray-600">Powered by Angular 21</p>
          </div>
        </div>

      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `
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
  vocalEnabled = signal(false);
  showVoiceControl = signal(false);
  showSettings = signal(false);
  userInput = signal('');
  playingMessageIndex = signal<number | null>(null);

  get sessionId(): string {
    return this.chatService.activeSessionId() || crypto.randomUUID();
  }

  currentSession = computed(() => {
    const id = this.chatService.activeSessionId();
    return this.sessions()?.find(s => s.id === id);
  });

  ngOnInit() {
    this.route.params.subscribe(params => {
      const sessionId = params['sessionId'];
      if (sessionId) {
        this.loadSession(sessionId);
      }
    });
  }

  onNewChat() {
    const newId = this.chatService.createNewSession();
    this.router.navigate(['/chat', newId]);
  }

  async loadSession(sessionId: string) {
    await this.chatService.loadSession(sessionId);
    this.router.navigate(['/chat', sessionId]);
  }

  async onRenameSession(event: { id: string; title: string }) {
    await this.chatService.renameSession(event.id, event.title);
  }

  async onDeleteSession(id: string) {
    await this.chatService.deleteSession(id);
    
    if (this.chatService.activeSessionId() === id) {
      this.onNewChat();
    }
  }

  async sendMessage() {
    const content = this.userInput().trim();
    if (!content) return;

    this.userInput.set('');
    
    const result = await this.messageService.sendTextMessage(
      content,
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

  async handleAudioRecorded(event: { base64: string }) {
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

  handlePlayAudio(event: { index: number; text: string }) {
    this.playingMessageIndex.set(event.index);
    this.speakText(event.text);
  }

  handleStopAudio() {
    this.ttsService.stop();
    this.playingMessageIndex.set(null);
    this.showVoiceControl.set(false);
  }

  private speakText(text: string) {
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
      }
    });

    if (this.isLiveMode()) {
      this.voiceCallService.startSpeaking();
    }
  }

  async toggleLiveMode() {
    this.isLiveMode.update(v => !v);
    
    if (this.isLiveMode()) {
      try {
        await this.voiceCallService.startCall({
          onTranscriptReady: (text) => this.handleVoiceTranscript(text),
          onInactivity: () => this.handleInactivity(),
          language: this.languageService.selectedLanguageCode()
        });
        
        this.vocalEnabled.set(true);
        this.showVoiceControl.set(true);
      } catch (error) {
        this.isLiveMode.set(false);
        alert('Could not access microphone. Please grant permission.');
      }
    } else {
      this.voiceCallService.stopCall();
      this.handleStopAudio();
    }
  }

  private async handleVoiceTranscript(text: string) {
    const result = await this.messageService.sendTextMessage(
      text,
      this.sessionId,
      this.languageService.selectedLanguageCode()
    );

    if (result) {
      this.chatService.activeSessionId.set(result.sessionId);
      this.chatService.sessionsResource.reload();
      this.speakText(result.text);
    } else {
      this.voiceCallService.finishSpeaking();
    }
  }

  private handleInactivity() {
    const fallbackMessage = "I can't hear you. Are you still there?";
    this.messageService.addMessage({ role: 'ai', text: fallbackMessage });
    this.speakText(fallbackMessage);
  }

  toggleVocal() {
    this.vocalEnabled.update(v => !v);
  }
}
