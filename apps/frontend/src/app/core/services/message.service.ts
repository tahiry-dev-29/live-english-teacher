import { Injectable, inject, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { environment } from '@environment';

export interface Message {
  role: 'user' | 'ai';
  text: string;
  audioData?: string;
  mimeType?: string;
}

const CHAT_MUTATION = gql`
  mutation Chat(
    $content: String!
    $sessionId: String!
    $audioData: String
    $mimeType: String
    $targetLanguage: String
  ) {
    chat(
      content: $content
      sessionId: $sessionId
      audioData: $audioData
      mimeType: $mimeType
      targetLanguage: $targetLanguage
    ) {
      text
      sessionId
    }
  }
`;

const GET_SESSION_MESSAGES = gql`
  query GetSessionMessages($sessionId: String!) {
    sessionMessages(sessionId: $sessionId) {
      role
      content
      createdAt
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private apollo = inject(Apollo);

  messages = signal<Message[]>([]);
  loading = signal(false);

  async loadSessionMessages(sessionId: string): Promise<void> {
    this.loading.set(true);

    try {
      const result = await this.apollo
        .query<{
          sessionMessages: {
            role: string;
            content: string;
            createdAt: string;
          }[];
        }>({
          query: GET_SESSION_MESSAGES,
          variables: { sessionId },
          fetchPolicy: 'network-only',
        })
        .toPromise();

      if (result?.data) {
        const sessionMessages = result.data.sessionMessages ?? [];
        const formattedMessages: Message[] = sessionMessages.map(
          (msg): Message => ({
            role: msg.role === 'model' ? 'ai' : (msg.role as Message['role']),
            text: msg.content,
          })
        );

        this.messages.set(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading session messages:', error);
      this.messages.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Envoie un message via l'endpoint SSE POST /api/ai/chat/stream : la réponse
   * IA est streamée token par token dans le signal `messages`. Fallback
   * automatique sur la mutation GraphQL si le streaming échoue.
   */
  async sendTextMessage(
    content: string,
    sessionId: string,
    targetLanguage: string
  ): Promise<{ text: string; sessionId: string } | null> {
    this.messages.update((msgs) => [...msgs, { role: 'user', text: content }]);
    this.loading.set(true);

    try {
      const result = await this.streamViaSSE(
        content,
        sessionId,
        targetLanguage
      );
      this.loading.set(false);
      return result;
    } catch (error) {
      console.error('SSE streaming failed, falling back to GraphQL:', error);
      this.removeStreamingPlaceholder();
      this.loading.set(false);
      return await this.sendViaGraphQL(content, sessionId, targetLanguage);
    }
  }

  private streamingIndex: number | null = null;

  private removeStreamingPlaceholder(): void {
    if (this.streamingIndex === null) return;

    const index = this.streamingIndex;
    this.streamingIndex = null;
    this.messages.update((msgs) =>
      index < msgs.length ? msgs.filter((_, i) => i !== index) : msgs
    );
  }

  private async streamViaSSE(
    content: string,
    sessionId: string,
    targetLanguage: string
  ): Promise<{ text: string; sessionId: string }> {
    const url = `${environment.apiBaseUrl}/ai/chat/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        sessionId: sessionId || undefined,
        targetLanguage,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`SSE request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let resolvedSessionId = sessionId;
    let fullText = '';
    let streamFailed = false;

    const pushToken = (token: string): void => {
      fullText += token;

      this.messages.update((msgs) => {
        if (this.streamingIndex !== null) {
          return msgs.map((msg, i) =>
            i === this.streamingIndex ? { ...msg, text: fullText } : msg
          );
        }

        this.streamingIndex = msgs.length;
        return [...msgs, { role: 'ai', text: fullText }];
      });
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line.startsWith('data:')) {
          const payload = line.slice(5).trim();

          if (payload && payload !== '[DONE]') {
            const data = JSON.parse(payload) as {
              sessionId?: string;
              token?: string;
              error?: boolean;
            };

            if (data.error) {
              streamFailed = true;
            } else {
              if (data.sessionId) resolvedSessionId = data.sessionId;
              if (data.token) pushToken(data.token);
            }
          }
        }

        newlineIndex = buffer.indexOf('\n');
      }
    }

    if (streamFailed) {
      throw new Error('SSE stream reported an error');
    }

    this.streamingIndex = null;
    return { text: fullText, sessionId: resolvedSessionId || sessionId };
  }

  private async sendViaGraphQL(
    content: string,
    sessionId: string,
    targetLanguage: string
  ): Promise<{ text: string; sessionId: string } | null> {
    try {
      const result = await this.apollo
        .mutate<{ chat: { text: string; sessionId: string } }>({
          mutation: CHAT_MUTATION,
          variables: {
            content,
            sessionId,
            targetLanguage,
          },
        })
        .toPromise();

      if (result?.data) {
        const chat = result.data.chat;

        this.messages.update((msgs) => [
          ...msgs,
          {
            role: 'ai',
            text: chat.text,
          },
        ]);

        return {
          text: chat.text,
          sessionId: chat.sessionId,
        };
      }

      return null;
    } catch (error) {
      console.error('Error sending message:', error);

      this.messages.update((msgs) => [
        ...msgs,
        {
          role: 'ai',
          text: 'Error: Could not connect to AI.',
        },
      ]);

      return null;
    }
  }

  async sendAudioMessage(
    audioData: string,
    mimeType: string,
    sessionId: string,
    targetLanguage: string
  ): Promise<{ text: string; sessionId: string } | null> {
    this.loading.set(true);
    try {
      const result = await this.apollo
        .mutate<{ chat: { text: string; sessionId: string } }>({
          mutation: CHAT_MUTATION,
          variables: {
            content: '',
            sessionId,
            audioData,
            mimeType,
            targetLanguage,
          },
        })
        .toPromise();

      this.loading.set(false);

      if (result?.data) {
        const chat = result.data.chat;
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'user', text: '[Audio message]' },
          { role: 'ai', text: chat.text },
        ]);
        return { text: chat.text, sessionId: chat.sessionId };
      }
      return null;
    } catch (error) {
      this.loading.set(false);
      console.error('Error sending audio message:', error);
      this.messages.update((msgs) => [
        ...msgs,
        { role: 'ai', text: 'Error: Could not process audio.' },
      ]);
      return null;
    }
  }

  clearMessages(): void {
    this.messages.set([]);
  }

  addMessage(message: Message): void {
    this.messages.update((msgs) => [...msgs, message]);
  }
}
