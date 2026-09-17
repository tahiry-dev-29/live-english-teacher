import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output,
  signal,
  afterNextRender,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Session } from '@models/session.model';
import { SidebarSessionListComponent } from './sidebar-session-list.component';
import { LucideMessageCircle, LucideSearch, LucideX } from '@lucide/angular';

/**
 * Command-palette de recherche dans l'historique des conversations.
 * Possède son propre état (`searchTerm` + filtre) : le composant est créé
 * à chaque ouverture (`@if`), donc l'état est réinitialisé automatiquement.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar-search-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarSessionListComponent,
    LucideMessageCircle,
    LucideSearch,
    LucideX,
  ],
  templateUrl: './sidebar-search-modal.component.html',
})
export class SidebarSearchModalComponent {
  readonly sessions = input<Session[]>([]);
  readonly activeSessionId = input<string | null>(null);
  readonly isReloading = input<boolean>(false);

  readonly sessionSelected = output<string>();
  readonly renameSession = output<{ id: string; title: string }>();
  readonly deleteSession = output<string>();
  readonly togglePinSession = output<{ id: string; isPinned: boolean }>();
  readonly reloadHistory = output<void>();
  readonly closed = output<void>();

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly searchTerm = signal<string>('');

  constructor() {
    afterNextRender(() => this.dialog()?.nativeElement.showModal());
  }

  readonly filteredSessions = computed<Session[]>(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.sessions();
    return this.sessions().filter((session) =>
      session.title.toLowerCase().includes(term),
    );
  });

  onSearchInput(term: string): void {
    this.searchTerm.set(term);
  }

  openFirstResult(): void {
    const first = this.filteredSessions()[0];
    if (first) {
      this.sessionSelected.emit(first.id);
      this.closed.emit();
    }
  }

  onSessionClick(sessionId: string): void {
    this.sessionSelected.emit(sessionId);
    this.closed.emit();
  }

  close(): void {
    this.closed.emit();
  }
}
