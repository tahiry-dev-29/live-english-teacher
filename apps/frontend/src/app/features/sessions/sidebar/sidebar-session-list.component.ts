import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { Session } from '@models/session.model';
import { NotificationService } from '@features/user-data/services/notification.service';
import {
  LucideMessageCircle,
  LucideRefreshCw,
  LucidePin,
  LucideCheck,
  LucideSlidersHorizontal,
} from '@lucide/angular';
import { ShareDialogComponent } from '../share-dialog/share-dialog.component';
import { SessionListItemComponent } from './session-list-item.component';
import { SessionDeleteDialogComponent } from './session-delete-dialog.component';
import { SessionSortBy, sortSessions } from './session-filter.util';

/** Session list shell: sorting + pin groups + rename/delete orchestration. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar-session-list',
  standalone: true,
  imports: [
    SessionListItemComponent,
    SessionDeleteDialogComponent,
    ShareDialogComponent,
    LucideMessageCircle,
    LucideRefreshCw,
    LucidePin,
    LucideCheck,
    LucideSlidersHorizontal,
  ],
  templateUrl: './sidebar-session-list.component.html',
})
export class SidebarSessionListComponent {
  private readonly notifications = inject(NotificationService);

  readonly sessions = input<Session[]>([]);
  readonly activeSessionId = input<string | null>(null);
  readonly isReloading = input<boolean>(false);
  readonly highlightTerm = input<string>('');

  readonly sessionClick = output<string>();
  readonly renameSession = output<{ id: string; title: string }>();
  readonly deleteSession = output<string>();
  readonly togglePinSession = output<{ id: string; isPinned: boolean }>();
  readonly reloadHistory = output<void>();

  readonly editingSessionId = signal<string | null>(null);
  readonly editTitle = signal<string>('');
  readonly sortBy = signal<SessionSortBy>('activity');
  readonly sharingSession = signal<Session | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly pendingDeleteTitle = signal<string>('');

  readonly sortedSessions = computed<Session[]>(() =>
    sortSessions(this.sessions(), this.sortBy()),
  );
  readonly pinnedSessions = computed<Session[]>(() =>
    this.sortedSessions().filter((item) => Boolean(item.isPinned)),
  );
  readonly recentSessions = computed<Session[]>(() =>
    this.sortedSessions().filter((item) => !item.isPinned),
  );
  readonly deleteDialogTitle = computed<string>(() => {
    const id = this.pendingDeleteId();
    return id ? this.pendingDeleteTitle() : '';
  });

  togglePin(sessionId: string, event?: Event): void {
    event?.stopPropagation();
    const session = this.sessions().find((item) => item.id === sessionId);
    const nextPinned = session ? !session.isPinned : true;
    this.togglePinSession.emit({ id: sessionId, isPinned: nextPinned });
    if (nextPinned) this.notifications.success('Conversation pinned to top');
    else this.notifications.info('Conversation unpinned');
  }

  shareConversation(item: Session, event?: Event): void {
    event?.stopPropagation();
    this.sharingSession.set(item);
  }

  closeShareDialog(): void {
    this.sharingSession.set(null);
  }

  startRename(session: Session, event?: Event): void {
    event?.stopPropagation();
    this.editingSessionId.set(session.id);
    this.editTitle.set(session.title);
  }

  saveRename(event: { id: string; title: string }): void {
    const title = event.title.trim();
    if (title) this.renameSession.emit({ id: event.id, title });
    this.editingSessionId.set(null);
  }

  cancelRename(): void {
    this.editingSessionId.set(null);
  }

  initDelete(session: Session, event?: Event): void {
    event?.stopPropagation();
    this.editingSessionId.set(null);
    this.pendingDeleteTitle.set(session.title || 'this conversation');
    this.pendingDeleteId.set(session.id);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (id) this.deleteSession.emit(id);
    this.pendingDeleteId.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }
}
