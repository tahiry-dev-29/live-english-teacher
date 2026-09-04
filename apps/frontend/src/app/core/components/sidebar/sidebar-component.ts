import { Component, signal, output, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Session } from '@models/session.model';
import { UserMenuComponent } from '../user-menu/user-menu-component';
import { SidebarSessionListComponent } from './sidebar-session-list.component';
import {
  LucideMessageCirclePlus,
  LucideSearch,
  LucideChevronDown,
  LucideChevronUp,
  LucideSettings,
  LucidePanelRightClose,
  LucidePanelRightOpen,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UserMenuComponent,
    SidebarSessionListComponent,
    LucideMessageCirclePlus,
    LucideSearch,
    LucideChevronDown,
    LucideChevronUp,
    LucideSettings,
    LucidePanelRightClose,
    LucidePanelRightOpen,
    LucideX,
  ],
  templateUrl: './sidebar-component.html',
})
export class SidebarComponent {
  isOpen = signal(true);
  isCollapsed = signal(false);
  isMobile = false;
  showSearchModal = signal(false);

  sessions = input<Session[]>([]);
  activeSessionId = input<string | null>(null);

  searchTerm = signal('');

  initialLimit = 5;
  visibleLimit = signal(5);
  showingAll = signal(false);

  filteredSessions = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.sessions();
    return this.sessions().filter((session) =>
      session.title.toLowerCase().includes(term)
    );
  });

  displayedSessions = computed(() => {
    const sessions = this.filteredSessions();
    if (this.showingAll()) return sessions;
    return sessions.slice(0, this.visibleLimit());
  });

  hasMoreSessions = computed(() => {
    return (
      !this.showingAll() && this.filteredSessions().length > this.visibleLimit()
    );
  });

  remainingCount = computed(() => {
    return this.filteredSessions().length - this.visibleLimit();
  });

  newChat = output<void>();
  sessionSelected = output<string>();
  renameSession = output<{ id: string; title: string }>();
  deleteSession = output<string>();
  openSettings = output<void>();

  constructor() {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  toggle() {
    this.isOpen.update((v) => !v);
  }

  toggleCollapse() {
    this.isCollapsed.update((v) => !v);
  }

  onNewChat() {
    this.newChat.emit();
    if (this.isMobile) this.isOpen.set(false);
  }

  openSearch() {
    this.showSearchModal.set(true);
  }

  closeSearch() {
    this.showSearchModal.set(false);
    this.searchTerm.set('');
  }

  onSearchInput(term: string) {
    this.searchTerm.set(term);
  }

  showMore() {
    this.showingAll.set(true);
  }

  showLess() {
    this.showingAll.set(false);
  }

  onSessionClick(sessionId: string) {
    this.sessionSelected.emit(sessionId);
    if (this.isMobile) this.isOpen.set(false);
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.isOpen.set(false);
    } else {
      this.isOpen.set(true);
    }
  }
}
