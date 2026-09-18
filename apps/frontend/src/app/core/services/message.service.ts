import { Injectable, inject, resource, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { ERROR_CODES, MESSAGES } from '@core/constants/messages';
import {
  GET_SESSION_MESSAGES,
  SessionMessagesQuery,
} from '@core/graphql/chat.operations';
import {
  AudioChatRequest,
  ChatAudioService,
} from '@core/services/chat-audio.service';
import { ChatStreamService } from '@core/services/chat-stream.service';
import { formatApiError } from '@core/utils/api-error.util';
import { ChatMessage, toChatRole } from '@models/chat-message.model';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private readonly apollo = inject(Apollo);
  private readonly chatStream = inject(ChatStreamService);
  private readonly chatAudio = inject(ChatAudioService);

  readonly currentSessionId = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal<boolean>(false);
  /** Set when the server API key quota is exhausted — prompts the user for their own key. */
  readonly quotaExceeded = signal<string | null>(null);

  private streamingIndex: number | null = null;
  private streamingText = '';

  /** Reactive loader for the messages of the active session. */
  readonly messagesResource = resource<ChatMessage[], string | null>({
    request: () => this.currentSessionId(),
    loader: async ({ request: sessionId }) => {
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

        const sessionMessages = result?.data?.sessionMessages ?? [];
        const formatted: ChatMessage[] = sessionMessages.map(
          (msg): ChatMessage => ({
            role: toChatRole(msg.role),
            text: msg.content,
          }),
        );
        this.messages.set(formatted);
        return formatted;
      } catch (error) {
        console.error(MESSAGES.log.messagesResourceFailed, error);
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

      const sessionMessages = result?.data?.sessionMessages ?? [];
      const formatted: ChatMessage[] = sessionMessages.map(
        (msg): ChatMessage => ({
          role: toChatRole(msg.role),
          text: msg.content,
        }),
      );
      this.messages.set(formatted);
      return formatted;
    } catch (error) {
      console.error(MESSAGES.log.messagesResourceFailed, error);
      this.messages.set([]);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Sends a message through the SSE endpoint. `sessionId` is null for a new chat:
   * the backend creates the session and returns its id in the first event.
   */
  async sendTextMessage(
    content: string,
    sessionId: string | null,
    targetLanguage: string,
  ): Promise<{ text: string; sessionId: string | null }> {
    this.messages.update((msgs) => [...msgs, { role: 'user', text: content }]);
    this.loading.set(true);
    this.streamingText = '';

    try {
      const result = await this.chatStream.streamChat(
        { message: content, sessionId, targetLanguage },
        (token) => this.pushStreamingToken(token),
      );
      this.loading.set(false);
      this.streamingIndex = null;

      if (result.error) {
        if (result.error.code === ERROR_CODES.quotaExceeded) {
          this.quotaExceeded.set(result.error.provider ?? 'groq');
        }
        const text = formatApiError(result.error.message);
        this.appendErrorMessage(text);
        return { text, sessionId: result.sessionId ?? sessionId };
      }

      return { text: result.text, sessionId: result.sessionId ?? sessionId };
    } catch (error) {
      console.error(MESSAGES.log.streamFailed, error);
      this.removeStreamingPlaceholder();
      this.loading.set(false);
      const text = formatApiError(
        error instanceof Error ? error.message : String(error),
      );
      this.appendErrorMessage(text);
      return { text, sessionId };
    }
  }

  async sendAudioMessage(
    audioData: string,
    mimeType: string,
    sessionId: string | null,
    targetLanguage: string,
  ): Promise<{ text: string; sessionId: string } | null> {
    this.loading.set(true);
    const request: AudioChatRequest = {
      audioData,
      mimeType,
      sessionId,
      targetLanguage,
    };
    const result = await this.chatAudio.sendAudio(request);
    this.loading.set(false);

    if (result.kind === 'ok') {
      this.messages.update((msgs) => [
        ...msgs,
        { role: 'user', text: '[Audio message]' },
        { role: 'ai', text: result.text },
      ]);
      return { text: result.text, sessionId: result.sessionId };
    }

    if (result.kind === 'error') {
      this.appendErrorMessage(MESSAGES.error.audioProcessingFailed);
    }

    return null;
  }

  clearMessages(): void {
    this.currentSessionId.set(null);
    this.messages.set([]);
  }

  addMessage(message: ChatMessage): void {
    this.messages.update((msgs) => [...msgs, message]);
  }

  private pushStreamingToken(token: string): void {
    this.streamingText += token;
    const fullText = this.streamingText;

    this.messages.update((msgs) => {
      if (this.streamingIndex !== null) {
        return msgs.map((msg, i) =>
          i === this.streamingIndex ? { ...msg, text: fullText } : msg,
        );
      }

      this.streamingIndex = msgs.length;
      return [...msgs, { role: 'ai', text: fullText }];
    });
  }

  private removeStreamingPlaceholder(): void {
    if (this.streamingIndex === null) return;

    const index = this.streamingIndex;
    this.streamingIndex = null;
    this.messages.update((msgs) =>
      index < msgs.length ? msgs.filter((_, i) => i !== index) : msgs,
    );
  }

  private appendErrorMessage(text: string): void {
    this.messages.update((msgs) => [
      ...msgs,
      { role: 'ai', text, kind: 'error' },
    ]);
  }
}
