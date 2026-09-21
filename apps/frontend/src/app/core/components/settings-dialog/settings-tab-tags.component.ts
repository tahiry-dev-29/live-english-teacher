import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import {
  LucideHash,
  LucidePlus,
  LucidePencil,
  LucideTrash2,
  LucideCheck,
  LucideX,
  LucideRotateCcw,
} from '@lucide/angular';
import { PromptTagService } from '@core/services/prompt-tag.service';
@Component({
  selector: 'app-settings-tab-tags',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideHash,
    LucidePlus,
    LucidePencil,
    LucideTrash2,
    LucideCheck,
    LucideX,
    LucideRotateCcw,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p
          class="flex items-center gap-1.5 text-xs font-medium tracking-wider text-base-content/50 uppercase"
        >
          <svg lucideHash class="h-3.5 w-3.5"></svg>
          <span>Skill tags ({{ tags.allTags().length }})</span>
        </p>
        <button
          type="button"
          class="btn gap-1 btn-ghost btn-xs"
          (click)="resetTags()"
          aria-label="Reset to defaults"
        >
          <svg lucideRotateCcw class="h-3 w-3"></svg>
          <span>Reset</span>
        </button>
      </div>

      <p class="text-[11px] leading-relaxed text-base-content/50">
        Type # in the chat input to use a tag. Tags add a small system prompt
        for that chat only.
      </p>

      <div class="join w-full">
        <input
          type="text"
          class="input-bordered input join-item w-24 font-mono text-xs input-sm"
          placeholder="tag_name"
          [value]="nameDraft()"
          (input)="nameDraft.set($any($event.target).value)"
        />
        <input
          type="text"
          class="input-bordered input join-item min-w-0 flex-1 text-xs input-sm"
          placeholder="Description / instruction for the AI…"
          [value]="descDraft()"
          (input)="descDraft.set($any($event.target).value)"
          (keyup.enter)="addTag()"
        />
        <button
          type="button"
          class="btn join-item btn-primary btn-sm"
          (click)="addTag()"
          [disabled]="!nameDraft().trim() || !descDraft().trim()"
          aria-label="Add tag"
        >
          <svg lucidePlus class="h-4 w-4"></svg>
        </button>
      </div>

      <ul class="flex flex-col gap-1.5">
        @for (tag of tags.allTags(); track tag.name) {
          <li
            class="flex items-start gap-2 rounded-xl border border-base-300 bg-base-100/40 px-3 py-2"
          >
            <span class="mt-0.5 badge shrink-0 badge-ghost font-mono badge-sm"
              >#{{ tag.name }}</span
            >
            @if (editingName() === tag.name) {
              <input
                type="text"
                class="input-bordered input min-w-0 flex-1 text-xs input-sm"
                [value]="editDraft()"
                (input)="editDraft.set($any($event.target).value)"
                (keyup.enter)="saveEdit(tag.name)"
                (keyup.escape)="cancelEdit()"
              />
              <button
                type="button"
                class="btn shrink-0 btn-ghost text-success btn-xs"
                (click)="saveEdit(tag.name)"
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
                tag.description
              }}</span>
              @if (tag.custom) {
                <button
                  type="button"
                  class="btn shrink-0 btn-ghost btn-xs"
                  (click)="startEdit(tag.name, tag.description)"
                  aria-label="Edit tag"
                >
                  <svg lucidePencil class="h-3 w-3"></svg>
                </button>
                <button
                  type="button"
                  class="btn shrink-0 btn-ghost text-error btn-xs"
                  (click)="removeTag(tag.name)"
                  aria-label="Delete tag"
                >
                  <svg lucideTrash2 class="h-3 w-3"></svg>
                </button>
              } @else {
                <span class="badge shrink-0 badge-ghost badge-xs"
                  >built-in</span
                >
              }
            }
          </li>
        }
      </ul>
    </div>
  `,
})
export class SettingsTabTagsComponent {
  readonly tags = inject(PromptTagService);

  readonly nameDraft = signal<string>('');
  readonly descDraft = signal<string>('');
  readonly editingName = signal<string | null>(null);
  readonly editDraft = signal<string>('');

  constructor() {
    void this.tags.ensureLoaded();
  }

  async addTag(): Promise<void> {
    const created = await this.tags.addCustom(
      this.nameDraft(),
      this.descDraft(),
    );
    if (created) {
      this.nameDraft.set('');
      this.descDraft.set('');
    }
  }

  startEdit(name: string, description: string): void {
    this.editingName.set(name);
    this.editDraft.set(description);
  }

  async saveEdit(name: string): Promise<void> {
    if (await this.tags.updateCustom(name, this.editDraft())) {
      this.editingName.set(null);
      this.editDraft.set('');
    }
  }

  cancelEdit(): void {
    this.editingName.set(null);
    this.editDraft.set('');
  }

  removeTag(name: string): void {
    void this.tags.removeCustom(name);
  }

  resetTags(): void {
    void this.tags.resetDefaults();
  }
}
