import { Component, signal, output, input, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Session } from '../../../models/session.model';
import { UserMenuComponent } from '../user-menu/user-menu-component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, UserMenuComponent],
  template: `
    <!-- Mobile Overlay -->
    @if (isOpen() && isMobile) {
      <div class="fixed inset-0 bg-black/50 z-20 backdrop-blur-sm transition-opacity" (click)="toggle()" (keyup.enter)="toggle()" tabindex="0" role="button" aria-label="Close sidebar overlay"></div>
    }

    <!-- Sidebar Container -->
    <aside 
      class="fixed md:relative z-30 h-full bg-gray-950 border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col shadow-2xl"
      [class.w-72]="isOpen() && !isCollapsed()"
      [class.w-16]="isOpen() && isCollapsed()"
      [class.w-0]="!isOpen()"
      [class.opacity-0]="!isOpen()"
      [class.md:opacity-100]="true"
      [class.overflow-hidden]="!isOpen()">
      
      <!-- Header -->
      <div class="p-4 border-b border-gray-800 flex items-center gap-3 bg-gray-900/50">
        @if (!isCollapsed()) {
          <div class="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap flex items-center gap-2 flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="url(#gradient)" class="w-6 h-6 shrink-0">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#60a5fa" />
                  <stop offset="100%" style="stop-color:#c084fc" />
                </linearGradient>
              </defs>
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.159 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            Live Teacher
          </div>
        }
        
        <!-- Toggle Collapse Button -->
        <button 
          (click)="toggleCollapse()" 
          class="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all cursor-pointer"
          [class.mx-auto]="isCollapsed()"
          title="Toggle sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
            class="w-5 h-5 transition-transform duration-300"
            [class.rotate-180]="isCollapsed()">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <!-- Mobile Close -->
        <button (click)="toggle()" class="md:hidden text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      @if (!isCollapsed()) {
        <!-- New Chat Button -->
        <div class="p-4">
          <button (click)="onNewChat()" class="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span class="font-medium">New Chat</span>
          </button>
        </div>

        <!-- History Search -->
        <div class="px-4 pb-2">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-500">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Search history..."
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              class="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <!-- History List -->
        <div class="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">
          <div class="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>History</span>
            <span class="text-gray-600 text-[10px] normal-case">{{ filteredSessions().length }} chats</span>
          </div>
          @for (item of displayedSessions(); track item.id) {
            <div class="group relative">
              @if (editingSessionId() === item.id) {
                <!-- Editing Mode -->
                <div class="px-3 py-2 rounded-lg bg-gray-800 border border-blue-500/50 flex items-center gap-2">
                  <input 
                    #editInput
                    type="text" 
                    [value]="editTitle()"
                    (input)="editTitle.set(editInput.value)"
                    (keyup.enter)="saveRename(item.id)"
                    (keyup.escape)="cancelRename()"
                    class="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-500"
                    placeholder="Session title"
                    autofocus
                  />
                  <button type="button" (click)="saveRename(item.id)" class="text-green-400 hover:text-green-300 p-1 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                  <button type="button" (click)="cancelRename()" class="text-gray-400 hover:text-gray-300 p-1 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              } @else {
                <!-- View Mode -->
                <button 
                  type="button"
                  (click)="onSessionClick(item.id)"
                  class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-800/50 text-gray-300 text-sm truncate transition-all flex items-center gap-2.5 group-hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors shrink-0">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <div class="truncate text-[13px]">{{ item.title }}</div>
                    <div class="text-[10px] text-gray-500 truncate">{{ item.learningLanguage | uppercase }} • {{ item.createdAt | date:'shortDate' }}</div>
                  </div>
                </button>
                <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all flex gap-1 bg-gray-900/90 rounded-lg p-0.5 shadow-lg backdrop-blur-sm">
                  <button type="button" (click)="startRename(item.id, item.title); $event.stopPropagation()" class="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-blue-400 rounded-md transition-colors cursor-pointer" title="Rename">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  
                  @if (confirmDeleteId() === item.id) {
                    <button type="button" (click)="confirmDelete(item.id); $event.stopPropagation()" class="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md transition-colors animate-pulse cursor-pointer" title="Confirm Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </button>
                  } @else {
                    <button type="button" (click)="initDelete(item.id); $event.stopPropagation()" class="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-red-400 rounded-md transition-colors cursor-pointer" title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  }
                </div>
              }
            </div>
          } @empty {
            <div class="px-3 py-8 text-sm text-gray-600 italic text-center flex flex-col items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 opacity-50">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.18.063-2.33.155-3.456.279-.966.108-1.755.858-1.755 1.863v4.413c0 .492.36.943.854 1.01.2.027.4.054.603.08.706.092 1.123.843.818 1.53l-1.035 3.693 3.573-1.074c.458-.137.936-.219 1.417-.243H12" />
              </svg>
              No history yet
            </div>
          }
          
          <!-- Voir Plus Button -->
          @if (hasMoreSessions()) {
            <button 
              type="button"
              (click)="showMore()"
              class="w-full mt-1 py-2 px-3 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-all flex items-center justify-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
              {{ remainingCount() }} more
            </button>
          }
          
          <!-- Show Less Button - Sticky at bottom -->
          @if (showingAll() && filteredSessions().length > initialLimit) {
            <div class="sticky bottom-0 pt-2 pb-1 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
              <button 
                type="button"
                (click)="showLess()"
                class="w-full py-1.5 px-3 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-all flex items-center justify-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
                Show less
              </button>
            </div>
          }
        </div>
      } @else {
        <!-- Collapsed View - Icons Only -->
        <div class="flex-1 flex flex-col items-center py-4 space-y-2">
          <button (click)="onNewChat()" class="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg cursor-pointer" title="New Chat">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      }

      <!-- Footer with User Menu -->
      <div class="p-4 border-t border-gray-800 bg-gray-900/50">
        @if (!isCollapsed()) {
          <app-user-menu (openSettings)="openSettings.emit()"></app-user-menu>
        } @else {
          <button 
            (click)="openSettings.emit()"
            class="w-full p-2 flex justify-center rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        }
      </div>
    </aside>
  `
})
export class SidebarComponent {
  isOpen = signal(true);
  isCollapsed = signal(false);
  isMobile = false;
  
  // History (from backend)
  sessions = input<Session[]>([]);
  
  // History Search
  searchTerm = signal('');
  
  // Pagination
  initialLimit = 5;
  visibleLimit = signal(5);
  showingAll = signal(false);
  
  filteredSessions = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.sessions();
    return this.sessions().filter(session => 
      session.title.toLowerCase().includes(term)
    );
  });
  
  displayedSessions = computed(() => {
    const sessions = this.filteredSessions();
    if (this.showingAll()) return sessions;
    return sessions.slice(0, this.visibleLimit());
  });
  
  hasMoreSessions = computed(() => {
    return !this.showingAll() && this.filteredSessions().length > this.visibleLimit();
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

  toggle() { this.isOpen.update(v => !v); }
  
  toggleCollapse() { 
    this.isCollapsed.update(v => !v); 
  }

  onNewChat() {
    this.newChat.emit();
    if (this.isMobile) this.isOpen.set(false);
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

  // Editing State
  editingSessionId = signal<string | null>(null);
  editTitle = signal('');
  
  // Delete Confirmation State
  confirmDeleteId = signal<string | null>(null);
  deleteTimeout: any;

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

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.isOpen.set(false);
    } else {
      this.isOpen.set(true);
    }
  }
}
