import { Injectable, inject, signal } from '@angular/core';
import { ERROR_CODES, MESSAGES } from '@core/constants/messages';
import {
  AudioChatRequest,
  ChatAudioService,
} from '@features/chat/services/chat-audio.service';
import { ChatStreamService } from '@features/chat/services/chat-stream.service';
import { PromptTagService } from '@features/user-data/services/prompt-tag.service';
import { MemoryService } from '@features/user-data/services/memory.service';
import { UserProfileService } from '@features/user-data/services/user-profile.service';
import { formatApiError } from '@core/utils/api-error.util';
import { ChatMessage } from '@models/chat-message.model';
import { LoggingService } from '@core/services/logging.service';
import {
  appendErrorMessage,
  pushStreamingToken,
  removeStreamingPlaceholder,
} from '@features/chat/services/message-mapper.util';
import { buildInvisibleContext } from '@features/chat/services/message-context.util';
import { MessageHistoryLoader } from '@features/chat/services/message-history.loader';

export interface StreamingCursor {
  index: number | null;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private readonly logger = inject(LoggingService);
  private readonly history = inject(MessageHistoryLoader);
  private readonly chatStream = inject(ChatStreamService);
  private readonly chatAudio = inject(ChatAudioService);
  private readonly promptTags = inject(PromptTagService);
  private readonly memories = inject(MemoryService);
  private readonly profile = inject(UserProfileService);

  readonly currentSessionId = this.history.currentSessionId;
  readonly messages = this.history.messages;
  readonly loading = signal<boolean>(false);
  /** Session history loading state (resource): drives skeletons, not send. */
  readonly historyLoading = this.history.loading;
  /**
   * True once the first token arrives until the stream ends. Drives the
   * "Thinking…" indicator (shown only while waiting) and the live cursor.
   */
  readonly streaming = signal<boolean>(false);
  /** Set when the server API key quota is exhausted — prompts the user for their own key. */
  readonly quotaExceeded = signal<string | null>(null);

  private cursor: StreamingCursor = { index: null, text: '' };

  /** Reactive loader for the messages of the active session (compat). */
  readonly messagesResource = this.history.messagesResource;

  async loadSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.history.loadSessionMessages(sessionId);
  }

  /**
   * Sends a message through the SSE endpoint. `sessionId` is null for a new chat:
   * the backend creates the session and returns its id in the first event.
   */
  async sendTextMessage(
    content: string,
    sessionId: string | null,
    targetLanguage: string,
  ): Promise<{
    text: string;
    sessionId: string | null;
    title?: string | null;
  }> {
    this.messages.update((msgs) => [...msgs, { role: 'user', text: content }]);
    this.loading.set(true);
    this.streaming.set(false);
    this.cursor = { index: null, text: '' };

    // Enterprise context (tasks 85/86/87): the bubble AND the DB keep the
    // raw text; profile + memories + #skill tags travel in a separate
    // `context` field the LLM sees but storage never does.
    const context = await this.loadInvisibleContext(content);

    try {
      const result = await this.chatStream.streamChat(
        { message: content, context, sessionId, targetLanguage },
        (token) => this.pushStreamingToken(token),
      );
      this.loading.set(false);
      this.streaming.set(false);
      this.cursor = { index: null, text: '' };

      if (result.error) {
        if (result.error.code === ERROR_CODES.quotaExceeded) {
          this.quotaExceeded.set(result.error.provider ?? 'groq');
        }
        const text = formatApiError(result.error.message);
        this.messages.update((msgs) => appendErrorMessage(msgs, text));
        return { text, sessionId: result.sessionId ?? sessionId };
      }

      return {
        text: result.text,
        sessionId: result.sessionId ?? sessionId,
        title: result.title,
      };
    } catch (error) {
      this.logger.error(MESSAGES.log.streamFailed, error);
      this.messages.update((msgs) => {
        const next = removeStreamingPlaceholder(msgs, this.cursor);
        this.cursor = next.cursor;
        return next.msgs;
      });
      this.loading.set(false);
      this.streaming.set(false);
      const text = formatApiError(
        error instanceof Error ? error.message : String(error),
      );
      this.messages.update((msgs) => appendErrorMessage(msgs, text));
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
    // Same invisible-context rule as text: DB stores '[Audio message]',
    // the LLM alone receives profile + memories (no text → no #tags).
    const context = await this.loadInvisibleContext('');
    const request: AudioChatRequest = {
      audioData,
      mimeType,
      sessionId,
      targetLanguage,
      context,
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
      this.messages.update((msgs) =>
        appendErrorMessage(msgs, MESSAGES.error.audioProcessingFailed),
      );
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

  /** LLM-only context ('' when empty) — never mixed into bubbles or DB. */
  private async loadInvisibleContext(content: string): Promise<string> {
    await Promise.all([
      this.memories.ensureLoaded(),
      this.profile.ensureLoaded(),
      this.promptTags.ensureLoaded(),
    ]);
    return buildInvisibleContext(
      this.profile.buildProfileContext(),
      this.memories.buildMemoryContext(),
      content ? this.promptTags.buildSystemPrompt(content) : '',
    );
  }

  private pushStreamingToken(token: string): void {
    this.messages.update((msgs) => {
      const next = pushStreamingToken(msgs, this.cursor, token);
      this.cursor = next.cursor;
      if (next.streaming && !this.streaming()) this.streaming.set(true);
      return next.msgs;
    });
  }
}
