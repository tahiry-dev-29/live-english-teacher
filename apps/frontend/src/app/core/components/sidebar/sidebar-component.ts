import {
  Component,
  signal,
  output,
  input,
  computed,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Session } from '@models/session.model';
import { UserMenuComponent } from '../user-menu/user-menu-component';
import { SidebarSearchModalComponent } from './sidebar-search-modal.component';
import { SidebarSessionListComponent } from './sidebar-session-list.component';
import { PwaService } from '@core/services/pwa.service';
import { ThemeService } from '@core/services/theme.service';
import {
  LucideMessageCirclePlus,
  LucideSquarePen,
  LucideSearch,
  LucideSettings,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideDownload,
  LucideChevronDown,
  LucideChevronUp,
} from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    UserMenuComponent,
    SidebarSearchModalComponent,
    SidebarSessionListComponent,
    LucideMessageCirclePlus,
    LucideSquarePen,
    LucideSearch,
    LucideSettings,
    LucidePanelLeftClose,
    LucidePanelLeftOpen,
    LucideDownload,
    LucideChevronDown,
    LucideChevronUp,
  ],
  templateUrl: './sidebar-component.html',
})
export class SidebarComponent {
  private readonly pwa = inject(PwaService);
  private readonly themeService = inject(ThemeService);

  /** Theme-aware app logo – white icon for dark background, dark icon for light background. */
  readonly logoSrc = computed<string>(() =>
    this.themeService.resolvedTheme() === 'app-dark'
      ? 'apple-touch-icon.png'
      : 'dark/apple-touch-icon.png',
  );

  readonly isOpen = signal<boolean>(true);
  readonly isCollapsed = signal<boolean>(false);
  isMobile = false;
  readonly showSearchModal = signal<boolean>(false);

  readonly sessions = input<Session[]>([]);
  readonly activeSessionId = input<string | null>(null);
  readonly isReloading = input<boolean>(false);

  readonly initialLimit = 10;
  readonly visibleLimit = signal<number>(this.initialLimit);
  readonly showingAll = signal<boolean>(false);

  readonly displayedSessions = computed<Session[]>(() => {
    const list = this.sessions();
    if (this.showingAll()) return list;
    return list.slice(0, this.visibleLimit());
  });

  readonly hasMoreSessions = computed<boolean>(() => {
    return !this.showingAll() && this.sessions().length > this.visibleLimit();
  });

  readonly remainingCount = computed<number>(() => {
    return Math.max(0, this.sessions().length - this.visibleLimit());
  });

  readonly newChat = output<void>();
  readonly sessionSelected = output<string>();
  readonly renameSession = output<{ id: string; title: string }>();
  readonly deleteSession = output<string>();
  readonly togglePinSession = output<{ id: string; isPinned: boolean }>();
  readonly reloadHistory = output<void>();
  readonly openSettings = output<void>();

  readonly canInstall = computed<boolean>(
    () => this.pwa.canInstall() && !this.pwa.isInstalled(),
  );

  constructor() {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        const t = e.target as HTMLElement | null;
        if (
          t &&
          (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        this.openSearch();
      }
    });
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
