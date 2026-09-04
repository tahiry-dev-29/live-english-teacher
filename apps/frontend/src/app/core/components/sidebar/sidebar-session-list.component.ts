import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Session } from '@models/session.model';
import {
  LucideMessageCircle,
  LucidePencil,
  LucideTrash2,
  LucideCheck,
  LucideX,
} from '@lucide/angular';

@Component({
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
  sessions = input<Session[]>([]);
  totalSessions = input(0);
  activeSessionId = input<string | null>(null);

  sessionClick = output<string>();
  renameSession = output<{ id: string; title: string }>();
  deleteSession = output<string>();

  editingSessionId = signal<string | null>(null);
  editTitle = signal('');
  confirmDeleteId = signal<string | null>(null);
  private deleteTimeout: ReturnType<typeof setTimeout> | null = null;

  startRename(sessionId: string, currentTitle: string) {
    this.editingSessionId.set(sessionId);
    this.editTitle.set(currentTitle);
    this.confirmDeleteId.set(null);
  }

  saveRename(sessionId: string) {
    const newTitle = this.editTitle().trim();
    if (newTitle) {
      this.renameSession.emit({ id: sessionId, title: newTitle });
    }
    this.editingSessionId.set(null);
  }

  cancelRename() {
    this.editingSessionId.set(null);
  }

  initDelete(sessionId: string) {
    this.confirmDeleteId.set(sessionId);
    this.editingSessionId.set(null);

    if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
    this.deleteTimeout = setTimeout(() => {
      this.confirmDeleteId.set(null);
    }, 3000);
  }

  confirmDelete(sessionId: string) {
    this.deleteSession.emit(sessionId);
    this.confirmDeleteId.set(null);
    if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
  }
}
