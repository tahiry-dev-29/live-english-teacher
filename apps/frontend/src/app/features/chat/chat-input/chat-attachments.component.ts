import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { LucideFileText, LucideX } from '@lucide/angular';
import { formatSize, type PromptAttachment } from './chat-input.util';

/** Attachment chips row above the composer — presentation only. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-attachments',
  standalone: true,
  imports: [LucideFileText, LucideX],
  template: `
    <div
      class="mb-2 flex flex-wrap gap-1.5"
      role="list"
      aria-label="Attachments"
    >
      @for (file of attachments(); track $index) {
        <span
          role="listitem"
          class="inline-flex max-w-55 items-center gap-1.5 rounded-xl border border-base-300 bg-base-100 py-1 pr-1.5 pl-2.5 text-xs"
        >
          <svg
            lucideFileText
            class="h-3.5 w-3.5 shrink-0 text-base-content/50"
          ></svg>
          <span class="truncate font-medium text-base-content/80">{{
            file.name
          }}</span>
          <span class="shrink-0 text-base-content/40">{{
            size(file.size)
          }}</span>
          <button
            type="button"
            (click)="remove.emit($index)"
            class="btn btn-circle h-5 min-h-0 w-5 btn-ghost text-base-content/50 btn-xs hover:text-error"
            [attr.aria-label]="'Remove ' + file.name"
          >
            <svg lucideX class="h-3 w-3"></svg>
          </button>
        </span>
      }
    </div>
  `,
})
export class ChatAttachmentsComponent {
  readonly attachments = input.required<PromptAttachment[]>();
  readonly remove = output<number>();

  protected size(bytes: number): string {
    return formatSize(bytes);
  }
}
