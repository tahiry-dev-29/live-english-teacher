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

  async sendTextMessage(
    content: string,
    sessionId: string,
    targetLanguage: string
  ): Promise<{ text: string; sessionId: string } | null> {
    this.messages.update((msgs) => [...msgs, { role: 'user', text: content }]);
    this.loading.set(true);

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

      this.loading.set(false);

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
      this.loading.set(false);
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

  /**
   * Envoie un message via l'endpoint SSE /api/ai/chat/stream : la réponse IA
   * est streamée token par token dans le signal `messages`. Fallback
   * automatique sur la mutation GraphQL si le SSE échoue.
   */

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
