import { Injectable, inject, resource, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { Session } from '@models/session.model';
import { MessageService } from './message.service';
import { LoggingService } from '@core/services/logging.service';

const GET_SESSIONS_QUERY = gql`
  query GetSessions {
    getSessions {
      id
      title
      learningLanguage
      isPinned
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
      isPinned
    }
  }
`;

const TOGGLE_PIN_SESSION_MUTATION = gql`
  mutation TogglePinSession($id: String!, $isPinned: Boolean!) {
    updateSession(data: { sessionId: $id, isPinned: $isPinned }) {
      id
      isPinned
    }
  }
`;

const DELETE_SESSION_MUTATION = gql`
  mutation DeleteSession($id: String!) {
    deleteSession(sessionId: $id)
  }
`;

const FORK_SESSION_MUTATION = gql`
  mutation ForkSession($sessionId: String!) {
    forkSession(sessionId: $sessionId) {
      id
      title
      createdAt
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly logger = inject(LoggingService);
  private apollo = inject(Apollo);
  private messageService = inject(MessageService);

  activeSessionId = signal<string | null>(null);

  /**
   * Guards the initial session fetch — stays `false` until `loadSessions()` is
   * called for the first time, so the resource does NOT fire on service creation.
   * This allows the UI to render before any network request is made.
   */
  private readonly _shouldLoadSessions = signal<boolean>(false);

  /**
   * Triggers the first session fetch (sets the guard to `true`) or reloads the
   * list if sessions are already loaded (e.g., after a mutation).
   * Call this from `ngOnInit` after the route subscription is set up.
   */
  loadSessions(): void {
    if (!this._shouldLoadSessions()) {
      this._shouldLoadSessions.set(true);
    } else {
      this.sessionsResource.reload();
    }
  }

  /**
   * Last successfully loaded sessions. `resource.value()` throws
   * `ResourceValueError` when `status() === 'error'` — reading that in the
   * template aborts change detection mid-binding and freezes the sidebar
   * spinner. Keep a non-throwing snapshot as the UI source of truth.
   */
  private readonly _sessions = signal<Session[]>([]);

  /**
   * Session list (history) — reactive fetching via `resource()`.
   * `reload()` / `isLoading()` power the reload button in the History header.
   * Mutations (rename/delete) remain imperative + `reload()`.
   * The loader is skipped until `_shouldLoadSessions` is true (lazy init).
   * On failure the resource goes to `error` but `_sessions` keeps the last
   * good list so the sidebar still renders.
   */
  sessionsResource = resource({
    params: () => this._shouldLoadSessions(),
    loader: ({ params: shouldLoad }) => {
      if (!shouldLoad) return Promise.resolve(this._sessions());
      return firstValueFrom(
        this.apollo.query<{ getSessions: Session[] }>({
          query: GET_SESSIONS_QUERY,
          fetchPolicy: 'network-only',
        }),
      ).then((result) => {
        const list = result.data?.getSessions ?? [];
        this._sessions.set(list);
        return list;
      });
    },
  });

  /** Non-throwing session list for templates (safe in resource error state). */
  readonly sessions = this._sessions.asReadonly();

  async renameSession(id: string, title: string) {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: RENAME_SESSION_MUTATION,
        variables: { id, title },
      }),
    );
    this.sessionsResource.reload();
  }

  async togglePinSession(id: string, isPinned: boolean) {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: TOGGLE_PIN_SESSION_MUTATION,
        variables: { id, isPinned },
      }),
    );
    this.sessionsResource.reload();
  }

  async deleteSession(id: string) {
    const result = await firstValueFrom(
      this.apollo.mutate<{ deleteSession: boolean }>({
        mutation: DELETE_SESSION_MUTATION,
        variables: { id },
      }),
    );
    if (!result.data?.deleteSession) {
      this.logger.error(
        `[ChatService] deleteSession returned false for id=${id}`,
      );
    }
    this.sessionsResource.reload();
  }

  /**
   * Creates a new session that is a snapshot/copy of the source session.
   * Returns the new session id (to be used as the share URL).
   * Mirrors Gemini's "Share conversation" behavior.
   */
  async forkSession(
    sourceSessionId: string,
  ): Promise<{ id: string; title: string } | null> {
    try {
      const result = await firstValueFrom(
        this.apollo.mutate<{
          forkSession: { id: string; title: string; createdAt: string };
        }>({
          mutation: FORK_SESSION_MUTATION,
          variables: { sessionId: sourceSessionId },
        }),
      );
      return result.data?.forkSession ?? null;
    } catch (err) {
      this.logger.error('[ChatService] forkSession failed:', err);
      return null;
    }
  }

  async loadSession(sessionId: string): Promise<void> {
    this.activeSessionId.set(sessionId);
    await this.messageService.loadSessionMessages(sessionId);
  }

  /**
   * "new chat" state: no id generated on the frontend side.
   * The session id is created by the backend (Prisma uuid) on the first message,
   * then returned via `result.sessionId`.
   */
  createNewSession(): void {
    this.activeSessionId.set(null);
    this.messageService.clearMessages();
  }
}
