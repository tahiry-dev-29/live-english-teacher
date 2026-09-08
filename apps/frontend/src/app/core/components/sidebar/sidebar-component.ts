import { Component, signal, output, input, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Session } from '@models/session.model';
import { UserMenuComponent } from '../user-menu/user-menu-component';
import { SidebarSessionListComponent } from './sidebar-session-list.component';
import { PwaService } from '@core/services/pwa.service';
import {
  LucideMessageCirclePlus,
  LucideSearch,
  LucideChevronDown,
  LucideChevronUp,
  LucideSettings,
  LucidePanelRightClose,
  LucidePanelRightOpen,
  LucideX,
  LucideDownload,
} from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    LucideDownload,
  ],
  templateUrl: './sidebar-component.html',
})
export class SidebarComponent {
  private readonly pwa = inject(PwaService);

  readonly isOpen = signal<boolean>(true);
  readonly isCollapsed = signal<boolean>(false);
  isMobile = false;
  readonly showSearchModal = signal<boolean>(false);

  readonly sessions = input<Session[]>([]);
  readonly activeSessionId = input<string | null>(null);

  readonly searchTerm = signal<string>('');

  readonly initialLimit = 5;
  readonly visibleLimit = signal<number>(5);
  readonly showingAll = signal<boolean>(false);

  readonly filteredSessions = computed<Session[]>(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.sessions();
    return this.sessions().filter((session) =>
      session.title.toLowerCase().includes(term)
    );
  });

  readonly displayedSessions = computed<Session[]>(() => {
    const sessions = this.filteredSessions();
    if (this.showingAll()) return sessions;
    return sessions.slice(0, this.visibleLimit());
  });

  readonly hasMoreSessions = computed<boolean>(() => {
    return (
      !this.showingAll() && this.filteredSessions().length > this.visibleLimit()
    );
  });

  readonly remainingCount = computed<number>(() => {
    return this.filteredSessions().length - this.visibleLimit();
  });

  readonly newChat = output<void>();
  readonly sessionSelected = output<string>();
  readonly renameSession = output<{ id: string; title: string }>();
  readonly deleteSession = output<string>();
  readonly openSettings = output<void>();

  readonly canInstall = computed<boolean>(() => this.pwa.canInstall() && !this.pwa.isInstalled());

  constructor() {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
    if (this.isMobile && this.isOpen()) {
      this.isCollapsed.set(false);
    }
  }

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  onNewChat(): void {
    this.newChat.emit();
    if (this.isMobile) this.isOpen.set(false);
  }

  openSearch(): void {
    this.showSearchModal.set(true);
  }

  closeSearch(): void {
    this.showSearchModal.set(false);
    this.searchTerm.set('');
  }

  onSearchInput(term: string): void {
    this.searchTerm.set(term);
  }

  showMore(): void {
    this.showingAll.set(true);
  }

  showLess(): void {
    this.showingAll.set(false);
  }

  async onInstall(): Promise<void> {
    await this.pwa.install();
  }

  onSessionClick(sessionId: string): void {
    this.sessionSelected.emit(sessionId);
    if (this.isMobile) this.isOpen.set(false);
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.isOpen.set(false);
    } else {
      this.isOpen.set(true);
    }
  }
}
