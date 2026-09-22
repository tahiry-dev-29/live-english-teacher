import {
  Component,
  ChangeDetectionStrategy,
  computed,
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
import { canAddTag } from './settings-tags.util';

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
  templateUrl: './settings-tab-tags.component.html',
})
export class SettingsTabTagsComponent {
  readonly tags = inject(PromptTagService);

  readonly nameDraft = signal<string>('');
  readonly descDraft = signal<string>('');
  readonly editingName = signal<string | null>(null);
  readonly editDraft = signal<string>('');

  readonly canAdd = computed(() =>
    canAddTag(this.nameDraft(), this.descDraft()),
  );

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

  retryLoad(): void {
    void this.tags.load();
  }

  resetTags(): void {
    void this.tags.resetDefaults();
  }
}
