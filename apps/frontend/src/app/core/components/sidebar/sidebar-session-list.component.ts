import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Session } from '@models/session.model';
import { LucideMessageCircle, LucidePencil, LucideTrash2, LucideCheck, LucideX } from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar-session-list',
  standalone: true,
  imports: [
    CommonModule,
    LucideMessageCircle,
    LucidePencil,
    LucideTrash2,
    LucideCheck,
    LucideX,
  ],
  templateUrl: './sidebar-session-list.component.html',
})
export class SidebarSessionListComponent {
  readonly sessions = input<Session[]>([]);
  readonly totalSessions = input<number>(0);
  readonly activeSessionId = input<string | null>(null);

  readonly sessionClick = output<string>();
  readonly renameSession = output<{ id: string; title: string }>();
  readonly deleteSession = output<string>();

  readonly editingSessionId = signal<string | null>(null);
  readonly editTitle = signal<string>('');
  readonly confirmDeleteId = signal<string | null>(null);
  private deleteTimeout: ReturnType<typeof setTimeout> | null = null;

  startRename(sessionId: string, currentTitle: string): void {
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

  initDelete(sessionId: string): void {
    this.confirmDeleteId.set(sessionId);
    this.editingSessionId.set(null);

    if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
    this.deleteTimeout = setTimeout(() => {
      this.confirmDeleteId.set(null);
    }, 3000);
  }

  confirmDelete(sessionId: string): void {
    this.deleteSession.emit(sessionId);
    this.confirmDeleteId.set(null);
    if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
  }
}
