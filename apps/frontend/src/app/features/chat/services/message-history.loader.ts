/**
 * Session history loading (Task 92): Apollo query + signals wiring.
 * Pure mapping lives in message-mapper.util.
 */
import { Injectable, inject, resource, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { MESSAGES } from '@core/constants/messages';
import {
  GET_SESSION_MESSAGES,
  SessionMessagesQuery,
} from '@core/graphql/chat.operations';
import { ChatMessage } from '@models/chat-message.model';
import { LoggingService } from '@core/services/logging.service';
import { mapSessionMessages } from '@features/chat/services/message-mapper.util';

@Injectable({ providedIn: 'root' })
export class MessageHistoryLoader {
  private readonly logger = inject(LoggingService);
  private readonly apollo = inject(Apollo);

  readonly currentSessionId = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal<boolean>(false);

  /** Reactive loader for the messages of the active session. */
  readonly messagesResource = resource<ChatMessage[], string | null>({
    params: () => this.currentSessionId(),
    loader: async ({ params: sessionId }) => {
      if (!sessionId) {
        this.messages.set([]);
        return [];
      }
      this.loading.set(true);
      try {
        const result = await firstValueFrom(
          this.apollo.query<SessionMessagesQuery>({
            query: GET_SESSION_MESSAGES,
            variables: { sessionId },
            fetchPolicy: 'network-only',
          }),
        );
        const formatted = mapSessionMessages(
          result?.data?.sessionMessages ?? [],
        );
        this.messages.set(formatted);
        return formatted;
      } catch (error) {
        this.logger.error(MESSAGES.log.messagesResourceFailed, error);
        this.messages.set([]);
        return [];
      } finally {
        this.loading.set(false);
      }
    },
  });

  async loadSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    this.currentSessionId.set(sessionId);
    this.loading.set(true);
    try {
      const result = await firstValueFrom(
        this.apollo.query<SessionMessagesQuery>({
          query: GET_SESSION_MESSAGES,
          variables: { sessionId },
          fetchPolicy: 'network-only',
        }),
      );
      const formatted = mapSessionMessages(result?.data?.sessionMessages ?? []);
      this.messages.set(formatted);
      return formatted;
    } catch (error) {
      this.logger.error(MESSAGES.log.messagesResourceFailed, error);
      this.messages.set([]);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  clearMessages(): void {
    this.currentSessionId.set(null);
    this.messages.set([]);
  }
}
