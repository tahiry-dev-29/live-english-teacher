import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
  LucideEllipsis,
  LucideSlidersHorizontal,
} from '@lucide/angular';
import { ShareDialogComponent } from '@core/components/share-dialog/share-dialog.component';

export type SessionSortBy = 'activity' | 'created' | 'name';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar-session-list',
  standalone: true,
  imports: [
    CommonModule,
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
    LucideEllipsis,
    LucideSlidersHorizontal,
  ],
  templateUrl: './sidebar-session-list.component.html',
})
export class SidebarSessionListComponent {
  private readonly notificationService = inject(NotificationService);

  readonly sessions = input<Session[]>([]);
  readonly activeSessionId = input<string | null>(null);
  readonly isReloading = input<boolean>(false);
  /** Terme à surligner dans les titres (vide = pas de surlignage). */
  readonly highlightTerm = input<string>('');

  readonly sessionClick = output<string>();
  readonly renameSession = output<{ id: string; title: string }>();
  readonly deleteSession = output<string>();
  readonly togglePinSession = output<{ id: string; isPinned: boolean }>();
  readonly reloadHistory = output<void>();

  readonly editingSessionId = signal<string | null>(null);
  readonly editTitle = signal<string>('');
  readonly confirmDeleteId = signal<string | null>(null);
  readonly sortBy = signal<SessionSortBy>('activity');
  readonly sharingSession = signal<Session | null>(null);

  private deleteTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Sessions triées selon le critère actif. */
  readonly sortedSessions = computed<Session[]>(() => {
    const list = [...this.sessions()];
    const sort = this.sortBy();

    return list.sort((a, b) => {
      if (sort === 'name') {
        return a.title.localeCompare(b.title);
      }
      if (sort === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // 'activity' (default)
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
  });

  /** Sessions épinglées (Pinned). */
  readonly pinnedSessions = computed<Session[]>(() => {
    return this.sortedSessions().filter((s) => Boolean(s.isPinned));
  });

  /** Sessions récentes non-épinglées (Recents). */
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
    this.confirmDeleteId.set(null);
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

  // ── Deleting ────────────────────────────────────────────────────────────

  initDelete(sessionId: string, event?: Event): void {
    event?.stopPropagation();
    this.confirmDeleteId.set(sessionId);
    this.editingSessionId.set(null);

    if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
    this.deleteTimeout = setTimeout(() => {
      this.confirmDeleteId.set(null);
    }, 3000);
  }

  confirmDelete(sessionId: string, event?: Event): void {
    event?.stopPropagation();
    this.deleteSession.emit(sessionId);
    this.confirmDeleteId.set(null);
    if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
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

