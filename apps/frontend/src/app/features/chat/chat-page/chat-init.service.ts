/**
 * Route + startup wiring for the chat page (Task 92 split).
 * Keeps the component free of subscription noise.
 */
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../services/chat.service';
import { MessageService } from '../services/message.service';
import { ChatPageState } from './chat-page.state';

@Injectable()
export class ChatInitService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = inject(ChatPageState);
  private readonly chatService = inject(ChatService);
  private readonly messageService = inject(MessageService);

  /** Subscribes to route params and loads the session list after first paint. */
  start(): void {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const sessionId = params['sessionId'] as string | undefined;
        this.state.isShared.set(this.router.url.startsWith('/share/'));

        if (sessionId) {
          // Route is the single source of truth — always load from params.
          // Covers direct URL navigation AND sidebar clicks
          // (sidebar click → router.navigate → params fires here).
          this.chatService.activeSessionId.set(sessionId);
          void this.messageService.loadSessionMessages(sessionId);
        } else {
          // "new chat" state: no id yet — backend creates it on first message.
          this.chatService.createNewSession();
        }
        this.state.userInput.set('');
      });

    // Defer the first session-list fetch so the UI renders first.
    setTimeout(() => this.chatService.loadSessions(), 0);
  }
}
