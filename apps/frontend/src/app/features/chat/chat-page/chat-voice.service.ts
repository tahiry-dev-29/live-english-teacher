/**
 * Chat voice/TTS orchestration (Task 84/92 split): speak, controls, live mode.
 * Depends on ChatPageState for the per-page signals it drives.
 */
import { inject, Injectable } from '@angular/core';
import { MESSAGES } from '@core/constants/messages';
import { LanguageService } from '@features/settings/services/language.service';
import { TtsService } from '@features/tts-voice/services/tts.service';
import { VoiceCallService } from '@features/voice-call/services/voice-call.service';
import { MessageService } from '@features/chat/services/message.service';
import { ChatPageState } from './chat-page.state';
import type { SpeakOptions } from './speak-options.model';

@Injectable()
export class ChatVoiceService {
  private readonly state = inject(ChatPageState);
  private readonly messageService = inject(MessageService);
  private readonly ttsService = inject(TtsService);
  private readonly voiceCallService = inject(VoiceCallService);
  private readonly languageService = inject(LanguageService);

  /** Callbacks for send orchestration (speak + live-mode probe). */
  get speakOptions(): SpeakOptions {
    return {
      speak: (text: string) => this.speak(text),
      isLiveMode: () => this.state.isLiveMode(),
    };
  }

  /** Speaks `text`, keeping the voice widget and live call in sync. */
  speak(text: string): void {
    this.state.vocalEnabled.set(true);
    if (!this.state.isLiveMode()) {
      this.state.showVoiceControl.set(true);
    }

    this.ttsService.speak(text, {
      voice: this.languageService.selectedVoice() || undefined,
      lang: this.languageService.selectedLanguageCode(),
      onEnd: () => {
        this.state.playingMessageIndex.set(null);
        if (this.state.isLiveMode()) {
          this.voiceCallService.finishSpeaking();
        } else {
          setTimeout(() => this.state.showVoiceControl.set(false), 500);
        }
      },
      onError: () => {
        this.state.playingMessageIndex.set(null);
        if (this.state.isLiveMode()) {
          this.voiceCallService.finishSpeaking();
        }
      },
    });

    if (this.state.isLiveMode()) {
      this.voiceCallService.startSpeaking();
    }
  }

  /** Message playback button → speak the bubble text. */
  playMessage(event: { text: string; index: number }): void {
    this.state.playingMessageIndex.set(event.index);
    this.speak(event.text);
  }

  stop(): void {
    this.ttsService.stop();
    this.state.playingMessageIndex.set(null);
    this.state.showVoiceControl.set(false);
  }

  pause(): void {
    this.ttsService.pause();
  }

  resume(): void {
    this.ttsService.resume();
  }

  /** Play-button retry after a TTS API failure (task 84). */
  retry(): void {
    void this.ttsService.retryLast();
  }

  seek(seconds: number): void {
    this.ttsService.seekTo(seconds);
  }

  setRecording(isRecording: boolean): void {
    this.state.isAudioRecording.set(isRecording);
  }

  /** Inactivity prompt during a live call: bubble + spoken fallback. */
  promptInactivity(): void {
    const fallback = MESSAGES.warning.inactivityPrompt;
    this.messageService.addMessage({ role: 'ai', text: fallback });
    this.speak(fallback);
  }

  dismissQuota(): void {
    this.messageService.quotaExceeded.set(null);
  }
}
