/**
 * Session-level actions for the chat page (Task 92 split):
 * new chat, selection, rename, pin, delete + feedback.
 */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { ChatPageState } from './chat-page.state';
import { ChatService } from '../services/chat.service';
import { MessageService } from '../services/message.service';

@Injectable()
export class ChatSessionService {
  private readonly router = inject(Router);
  private readonly state = inject(ChatPageState);
  private readonly chatService = inject(ChatService);
  private readonly messageService = inject(MessageService);
  private readonly notifications = inject(NotificationService);

  onNewChat(): void {
    // No id generated here: the backend creates the session on the first message.
    this.chatService.createNewSession();
    this.router.navigate(['/']);
  }

  /**
   * Session selected from the sidebar: navigate only (route params load it),
   * except in shared-view mode where we load directly.
   */
  loadSession(sessionId: string): void {
    if (this.state.isShared()) {
      this.chatService.activeSessionId.set(sessionId);
      void this.messageService.loadSessionMessages(sessionId);
      this.state.userInput.set('');
      return;
    }
    this.router.navigate(['/chat', sessionId]);
  }

  rename(id: string, title: string): void {
    void this.chatService.renameSession(id, title);
  }

  togglePin(id: string, isPinned: boolean): void {
    void this.chatService.togglePinSession(id, isPinned);
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await this.chatService.deleteSession(sessionId);
      this.notifications.success('Conversation deleted');
      if (this.chatService.activeSessionId() === sessionId) {
        this.chatService.createNewSession();
        this.router.navigate(['/']);
      }
    } catch {
      this.notifications.error('Failed to delete conversation');
    }
  }
}
