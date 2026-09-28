import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  LucideBrain,
  LucidePlus,
  LucidePencil,
  LucideTrash2,
  LucideCheck,
  LucideX,
} from '@lucide/angular';
import { MemoryService } from '@features/user-data/services/memory.service';
import { MemoryOwnerService } from '@features/user-data/services/memory-owner.service';
import {
  canAddMemory,
  counterLabel,
  isEditing,
  normalizeScope,
  scopeLabel,
  type MemoryScopeTab,
} from '@features/user-data/services/memory-tab.util';

@Component({
  selector: 'app-settings-tab-memory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideBrain,
    LucidePlus,
    LucidePencil,
    LucideTrash2,
    LucideCheck,
    LucideX,
  ],
  templateUrl: './settings-tab-memory.component.html',
})
export class SettingsTabMemoryComponent {
  private readonly memory = inject(MemoryService);
  private readonly owner = inject(MemoryOwnerService);

  readonly draft = signal<string>('');
  readonly editingId = signal<string | null>(null);
  readonly editDraft = signal<string>('');

  readonly memories = this.memory.memories;
  readonly loadError = this.memory.error;
  readonly full = this.memory.isFull;
  readonly readOnly = computed(() => !this.owner.isAuthenticated());
  readonly scopeTab = this.owner.scopeTab;
  readonly counter = computed(() =>
    counterLabel(this.memory.count(), this.memory.maxMemories()),
  );
  readonly scopeName = computed(() =>
    scopeLabel(
      normalizeScope(this.scopeTab(), this.owner.activeModelScope()) === 'model'
        ? this.owner.activeModelScope()
        : null,
    ),
  );

  constructor() {
    this.memory.ensureLoaded();
  }

  selectTab(tab: MemoryScopeTab): void {
    this.owner.scopeTab.set(tab);
    this.memory.load();
  }

  addMemory(): void {
    if (!canAddMemory(this.draft(), this.scopeTab())) return;
    this.memory.add(this.draft());
    this.draft.set('');
  }

  startEdit(id: string, text: string): void {
    this.editingId.set(id);
    this.editDraft.set(text);
  }

  saveEdit(id: string): void {
    if (!isEditing(this.editingId(), id)) return;
    this.memory.update(id, this.editDraft());
    this.editingId.set(null);
    this.editDraft.set('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set('');
  }

  removeMemory(id: string): void {
    this.memory.remove(id);
  }

  retryLoad(): void {
    this.memory.load();
  }
}
