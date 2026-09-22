import {
  Component,
  ChangeDetectionStrategy,
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
import { MemoryService } from '@core/services/memory.service';

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
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p
          class="flex items-center gap-1.5 text-xs font-medium tracking-wider text-base-content/50 uppercase"
        >
          <svg lucideBrain class="h-3.5 w-3.5"></svg>
          <span>Memory</span>
        </p>
        <span class="badge badge-ghost badge-sm tabular-nums"
          >{{ memory.count() }}/{{ maxMemories }}</span
        >
      </div>

      <p class="text-[11px] leading-relaxed text-base-content/50">
        Things to remember about you across chats — like ChatGPT memories.
      </p>

      @if (memory.error() && memory.memories().length === 0) {
        <div
          class="flex items-center justify-between gap-2 rounded-lg border border-error/30 bg-error/10 p-3"
        >
          <p class="text-xs">
            Cannot reach the server. Start the backend, then retry.
          </p>
          <button
            type="button"
            class="btn shrink-0 btn-ghost btn-xs"
            (click)="retryLoad()"
          >
            Retry
          </button>
        </div>
      }

      <!-- Add -->
      @if (!memory.isFull()) {
        <div class="join w-full">
          <input
            type="text"
            class="input-bordered input join-item flex-1 text-xs input-sm"
            placeholder="Remember that I…"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
            (keyup.enter)="addMemory()"
          />
          <button
            type="button"
            class="btn join-item btn-primary btn-sm"
            (click)="addMemory()"
            [disabled]="!draft().trim()"
            aria-label="Add memory"
          >
            <svg lucidePlus class="h-4 w-4"></svg>
          </button>
        </div>
      } @else {
        <p
          class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs"
        >
          Memory is full ({{ maxMemories }}). Delete one to add a new memory.
        </p>
      }

      <!-- List -->
      @if (memory.memories().length === 0) {
        <p
          class="rounded-lg border border-dashed p-4 text-center text-xs text-base-content/50"
        >
          No memories yet. Add your first one above.
        </p>
      } @else {
        <ul class="flex flex-col gap-1.5">
          @for (item of memory.memories(); track item.id) {
            <li
              class="flex items-start gap-2 rounded-xl border border-base-300 bg-base-100/40 px-3 py-2"
            >
              @if (editingId() === item.id) {
                <input
                  type="text"
                  class="input-bordered input min-w-0 flex-1 text-xs input-sm"
                  [value]="editDraft()"
                  (input)="editDraft.set($any($event.target).value)"
                  (keyup.enter)="saveEdit(item.id)"
                  (keyup.escape)="cancelEdit()"
                />
                <button
                  type="button"
                  class="btn shrink-0 btn-ghost text-success btn-xs"
                  (click)="saveEdit(item.id)"
                  aria-label="Save"
                >
                  <svg lucideCheck class="h-3.5 w-3.5"></svg>
                </button>
                <button
                  type="button"
                  class="btn shrink-0 btn-ghost btn-xs"
                  (click)="cancelEdit()"
                  aria-label="Cancel"
                >
                  <svg lucideX class="h-3.5 w-3.5"></svg>
                </button>
              } @else {
                <span class="min-w-0 flex-1 text-xs leading-relaxed">{{
                  item.text
                }}</span>
                <button
                  type="button"
                  class="btn shrink-0 btn-ghost btn-xs"
                  (click)="startEdit(item.id, item.text)"
                  aria-label="Edit memory"
                >
                  <svg lucidePencil class="h-3 w-3"></svg>
                </button>
                <button
                  type="button"
                  class="btn shrink-0 btn-ghost text-error btn-xs"
                  (click)="removeMemory(item.id)"
                  aria-label="Delete memory"
                >
                  <svg lucideTrash2 class="h-3 w-3"></svg>
                </button>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class SettingsTabMemoryComponent {
  readonly memory = inject(MemoryService);

  readonly maxMemories = MemoryService.MAX_MEMORIES;
  readonly draft = signal<string>('');
  readonly editingId = signal<string | null>(null);
  readonly editDraft = signal<string>('');

  constructor() {
    void this.memory.ensureLoaded();
  }

  async addMemory(): Promise<void> {
    const created = await this.memory.add(this.draft());
    if (created) this.draft.set('');
  }

  startEdit(id: string, text: string): void {
    this.editingId.set(id);
    this.editDraft.set(text);
  }

  async saveEdit(id: string): Promise<void> {
    if (await this.memory.update(id, this.editDraft())) {
      this.editingId.set(null);
      this.editDraft.set('');
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set('');
  }

  removeMemory(id: string): void {
    void this.memory.remove(id);
  }

  retryLoad(): void {
    void this.memory.load();
  }
}
