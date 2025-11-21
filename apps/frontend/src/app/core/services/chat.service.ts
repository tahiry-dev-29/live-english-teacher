import { Injectable, inject, resource, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { Session } from '../../models/session.model';
import { MessageService } from './message.service';

const GET_SESSIONS_QUERY = gql`
  query GetSessions {
    getSessions {
      id
      title
      learningLanguage
      createdAt
      updatedAt
      lastMessage
    }
  }
`;

const RENAME_SESSION_MUTATION = gql`
  mutation UpdateSession($id: String!, $title: String!) {
    updateSession(data: { sessionId: $id, title: $title }) {
      id
      title
    }
  }
`;

const DELETE_SESSION_MUTATION = gql`
  mutation DeleteSession($id: String!) {
    deleteSession(sessionId: $id)
  }
`;

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apollo = inject(Apollo);
  private messageService = inject(MessageService);

  activeSessionId = signal<string | null>(null);

  sessionsResource = resource({
    loader: () => {
      return firstValueFrom(
        this.apollo.query<{ getSessions: Session[] }>({
          query: GET_SESSIONS_QUERY,
          fetchPolicy: 'network-only'
        })
      ).then(result => result.data?.getSessions ?? []);
    }
  });

  sessions = this.sessionsResource.value;

  async renameSession(id: string, title: string) {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: RENAME_SESSION_MUTATION,
        variables: { id, title }
      })
    );
    this.sessionsResource.reload();
  }

  async deleteSession(id: string) {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: DELETE_SESSION_MUTATION,
        variables: { id }
      })
    );
    this.sessionsResource.reload();
  }

  async loadSession(sessionId: string): Promise<void> {
    this.activeSessionId.set(sessionId);
    await this.messageService.loadSessionMessages(sessionId);
  }

  createNewSession(): string {
    const newSessionId = crypto.randomUUID();
    this.activeSessionId.set(newSessionId);
    this.messageService.clearMessages();
    return newSessionId;
  }
}
