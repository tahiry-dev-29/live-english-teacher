import { Injectable, inject, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';

export interface Message {
  role: 'user' | 'ai';
  text: string;
  audioData?: string;
  mimeType?: string;
}

const CHAT_MUTATION = gql`
  mutation Chat($content: String!, $sessionId: String!, $audioData: String, $mimeType: String, $targetLanguage: String) {
    chat(content: $content, sessionId: $sessionId, audioData: $audioData, mimeType: $mimeType, targetLanguage: $targetLanguage) {
      text
      sessionId
    }
  }
`;

const GET_SESSION_MESSAGES = gql`
  query GetSessionMessages($sessionId: String!) {
    sessionMessages(sessionId: $sessionId) {
      id
      role
      content
      createdAt
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apollo = inject(Apollo);
  
  // State
  messages = signal<Message[]>([]);
  loading = signal(false);

  async loadSessionMessages(sessionId: string): Promise<void> {
    this.loading.set(true);
    
    try {
      const result = await this.apollo.query({
        query: GET_SESSION_MESSAGES,
        variables: { sessionId },
        fetchPolicy: 'network-only'
      }).toPromise();

      if (result?.data) {
        const sessionMessages = (result.data as any).sessionMessages || [];
        const formattedMessages: Message[] = sessionMessages.map((msg: any) => ({
          role: msg.role,
          text: msg.content
        }));
        
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
    this.messages.update(msgs => [...msgs, { role: 'user', text: content }]);
    this.loading.set(true);

    try {
      const result = await this.apollo.mutate({
        mutation: CHAT_MUTATION,
        variables: { 
          content, 
          sessionId,
          targetLanguage
        },
      }).toPromise();

      this.loading.set(false);

      if (result?.data) {
        const chat = (result.data as any).chat;
        
        this.messages.update(msgs => [...msgs, { 
          role: 'ai', 
          text: chat.text 
        }]);

        return {
          text: chat.text,
          sessionId: chat.sessionId
        };
      }

      return null;
    } catch (error) {
      this.loading.set(false);
      console.error('Error sending message:', error);
      
      this.messages.update(msgs => [...msgs, { 
        role: 'ai', 
        text: 'Error: Could not connect to AI.' 
      }]);

      return null;
    }
  }

  async sendAudioMessage(
    audioData: string,
    mimeType: string,
    sessionId: string,
    targetLanguage: string
  ): Promise<{ text: string; sessionId: string } | null> {
    this.messages.update(msgs => [...msgs, { 
      role: 'user', 
      text: '🎤 [Audio Message]' 
    }]);
    this.loading.set(true);

    try {
      const result = await this.apollo.mutate({
        mutation: CHAT_MUTATION,
        variables: { 
          content: '', 
          sessionId,
          audioData,
          mimeType,
          targetLanguage
        },
      }).toPromise();

      this.loading.set(false);

      if (result?.data) {
        const chat = (result.data as any).chat;
        
        this.messages.update(msgs => [...msgs, { 
          role: 'ai', 
          text: chat.text 
        }]);

        return {
          text: chat.text,
          sessionId: chat.sessionId
        };
      }

      return null;
    } catch (error) {
      this.loading.set(false);
      console.error('Error sending audio message:', error);
      
      this.messages.update(msgs => [...msgs, { 
        role: 'ai', 
        text: 'Error: Could not process audio.' 
      }]);

      return null;
    }
  }

  clearMessages(): void {
    this.messages.set([]);
  }

  addMessage(message: Message): void {
    this.messages.update(msgs => [...msgs, message]);
  }
}
