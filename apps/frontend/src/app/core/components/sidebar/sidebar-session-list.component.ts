import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject,
  viewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { Session } from '@models/session.model';
import { NotificationService } from '@core/services/notification.service';
import {
  LucideMessageCircle,
  LucidePencil,
  LucideTrash2,
  LucideCheck,
  LucideX,
  LucideRefreshCw,
  LucidePin,
  LucidePinOff,
  LucideShare2,
  LucideSlidersHorizontal,
  LucideTriangleAlert,
} from '@lucide/angular';
import { ShareDialogComponent } from '../share-dialog/share-dialog.component';
import { AppDropdownMenuComponent } from '../ui/dropdown-menu/dropdown-menu.component';

export type SessionSortBy = 'activity' | 'created' | 'name';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar-session-list',
  standalone: true,
  imports: [
    AppDropdownMenuComponent,
    ShareDialogComponent,
    LucideMessageCircle,
    LucidePencil,
    LucideTrash2,
    LucideCheck,
    LucideX,
    LucideRefreshCw,
    LucidePin,
    LucidePinOff,
    LucideShare2,
    LucideSlidersHorizontal,
    LucideTriangleAlert,
  ],
  templateUrl: './sidebar-session-list.component.html',
})
export class SidebarSessionListComponent {
  private readonly notificationService = inject(NotificationService);

  readonly sessions = input<Session[]>([]);
  readonly activeSessionId = input<string | null>(null);
  readonly isReloading = input<boolean>(false);
  /** Term to highlight in titles (empty = no highlighting). */
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

  /** ID of the session pending deletion (shown in the confirmation modal) */
  readonly pendingDeleteId = signal<string | null>(null);
  readonly pendingDeleteTitle = signal<string>('');

  /** Reference to the delete confirmation dialog element */
  readonly deleteConfirmDialog = viewChild<ElementRef<HTMLDialogElement>>(
    'deleteConfirmDialog',
  );

  constructor() {
    // Keep the dialog in sync with pendingDeleteId signal
    effect(() => {
      const hasPending = this.pendingDeleteId() !== null;
      const el = this.deleteConfirmDialog()?.nativeElement;
      if (!el) return;
      if (hasPending && !el.open) {
        el.showModal();
      } else if (!hasPending && el.open) {
        el.close();
      }
    });
  }

  /** Sessions sorted by the active criterion. */
  readonly sortedSessions = computed<Session[]>(() => {
    const list = [...this.sessions()];
    const sort = this.sortBy();

    return list.sort((a, b) => {
      if (sort === 'name') {
        return a.title.localeCompare(b.title);
      }
      if (sort === 'created') {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      // 'activity' (default)
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
  });

  /** Pinned sessions. */
  readonly pinnedSessions = computed<Session[]>(() => {
    return this.sortedSessions().filter((s) => Boolean(s.isPinned));
  });

  /** Recent non-pinned sessions. */
  readonly recentSessions = computed<Session[]>(() => {
    return this.sortedSessions().filter((s) => !s.isPinned);
  });

  // ── Pinning ─────────────────────────────────────────────────────────────

  togglePin(sessionId: string, event?: Event): void {
    event?.stopPropagation();
    const session = this.sessions().find((s) => s.id === sessionId);
    const nextPinned = session ? !session.isPinned : true;
    this.togglePinSession.emit({ id: sessionId, isPinned: nextPinned });
    if (nextPinned) {
      this.notificationService.success('Conversation pinned to top');
    } else {
      this.notificationService.info('Conversation unpinned');
    }
  }

  isPinned(sessionId: string): boolean {
    const session = this.sessions().find((s) => s.id === sessionId);
    return Boolean(session?.isPinned);
  }

  // ── Sharing ─────────────────────────────────────────────────────────────
  shareConversation(item: Session, event?: Event): void {
    event?.stopPropagation();
    this.sharingSession.set(item);
  }

  closeShareDialog(): void {
    this.sharingSession.set(null);
  }

  // ── Renaming ────────────────────────────────────────────────────────────

  startRename(sessionId: string, currentTitle: string, event?: Event): void {
    event?.stopPropagation();
    this.editingSessionId.set(sessionId);
    this.editTitle.set(currentTitle);
  }

  saveRename(sessionId: string): void {
    const newTitle = this.editTitle().trim();
    if (newTitle) {
      this.renameSession.emit({ id: sessionId, title: newTitle });
    }
    this.editingSessionId.set(null);
  }

  cancelRename(): void {
    this.editingSessionId.set(null);
  }

  // ── Deleting ─────────────────────────────────────────────────────────────

  /** Opens the confirmation modal for the given session. */
  initDelete(session: Session, event?: Event): void {
    event?.stopPropagation();
    this.editingSessionId.set(null);
    this.pendingDeleteTitle.set(session.title || 'this conversation');
    this.pendingDeleteId.set(session.id);
  }

  /** Called when the user confirms deletion in the modal. */
  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (id) {
      this.deleteSession.emit(id);
    }
    this.pendingDeleteId.set(null);
  }

  /** Called when the user cancels deletion in the modal. */
  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  // ── Highlighting ────────────────────────────────────────────────────────

  highlightedTitle(title: string): string {
    const term = this.highlightTerm().trim().toLowerCase();
    if (!term) return escapeHtml(title);
    const lower = title.toLowerCase();
    let out = '';
    let i = 0;
    for (;;) {
      const idx = lower.indexOf(term, i);
      if (idx < 0) return out + escapeHtml(title.slice(i));
      out += escapeHtml(title.slice(i, idx));
      out += `<mark class="rounded-sm bg-primary/30 text-inherit">${escapeHtml(title.slice(idx, idx + term.length))}</mark>`;
      i = idx + term.length;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
