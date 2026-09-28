/**
 * Chat send + session mutation orchestration (Task 82/92 split).
 * Pure orchestration over injected services — no template, no signals.
 * New-chat title is AI-written backend-side (SessionTitleService);
 * here we only refresh the history so the sidebar picks it up.
 */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService } from '@features/chat/services/chat.service';
import { MessageService } from '@features/chat/services/message.service';
import { LanguageService } from '@features/settings/services/language.service';
import type { SpeakOptions } from './speak-options.model';

@Injectable()
export class ChatSendService {
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);
  private readonly messageService = inject(MessageService);
  private readonly languageService = inject(LanguageService);

  get sessionId(): string | null {
    return this.chatService.activeSessionId();
  }

  /** Text send (composer or live transcript) + history refresh for AI title. */
  async sendText(
    rawText: string,
    opts: SpeakOptions,
  ): Promise<{ text: string; sessionId: string | null } | null> {
    const text = rawText.trim();
    if (!text) return null;
    const wasNewChat = this.sessionId === null;
    const result = await this.messageService.sendTextMessage(
      text,
      this.sessionId,
      this.languageService.selectedLanguageCode(),
    );
    this.afterSend(result, wasNewChat, opts);
    return result;
  }

  /** Audio send (base64 recording) + history refresh for AI title. */
  async sendAudio(
    base64: string,
    mimeType: string,
    opts: SpeakOptions,
  ): Promise<void> {
    const wasNewChat = this.sessionId === null;
    const result = await this.messageService.sendAudioMessage(
      base64,
      mimeType,
      this.sessionId,
      this.languageService.selectedLanguageCode(),
    );
    if (!result) return;
    this.chatService.activeSessionId.set(result.sessionId);
    if (wasNewChat) this.chatService.loadSessions();
    this.router.navigate(['/chat', result.sessionId]);
    if (opts.isLiveMode()) opts.speak(result.text);
  }

  /** Re-sends the last user message at or before `index` (retry action). */
  retryFrom(index: number, opts: SpeakOptions): void {
    const msgs = this.messageService.messages();
    for (let i = index; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        void this.sendText(msgs[i].text, opts);
        return;
      }
    }
  }

  /** Branches the conversation: keeps messages up to `index` in a new chat. */
  forkFrom(index: number): void {
    const msgs = this.messageService.messages().slice(0, index + 1);
    this.chatService.createNewSession();
    this.messageService.clearMessages();
    for (const msg of msgs) {
      this.messageService.addMessage(msg);
    }
    this.router.navigate(['/']);
  }

  private afterSend(
    result: { text: string; sessionId: string | null } | null,
    wasNewChat: boolean,
    opts: SpeakOptions,
  ): void {
    if (!result) return;
    if (result.sessionId) {
      this.chatService.activeSessionId.set(result.sessionId);
      // Title is AI-written backend-side and sent as an SSE `title` event;
      // a single history reload picks it up (no rename from here).
      if (wasNewChat) this.chatService.loadSessions();
      this.router.navigate(['/chat', result.sessionId]);
    }
    // On error the bubble is already in the thread; only speak when live.
    if (opts.isLiveMode()) opts.speak(result.text);
  }
}
