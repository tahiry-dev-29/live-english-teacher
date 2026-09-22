import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PromptTag } from '@core/services/prompt-tag.service';

/** `#tag` autocomplete dropdown (task 87) — presentation only. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-tag-suggestions',
  standalone: true,
  template: `
    <ul
      role="listbox"
      aria-label="Skill tags"
      class="menu absolute right-0 bottom-full left-0 z-30 mb-1 max-h-52 overflow-y-auto rounded-2xl border border-base-300 bg-base-200/95 p-1.5 shadow-2xl backdrop-blur-md"
    >
      @for (tag of suggestions(); track tag.name; let i = $index) {
        <li>
          <button
            type="button"
            role="option"
            [attr.aria-selected]="i === activeIndex()"
            (click)="pick.emit(tag.name)"
            (mouseenter)="hover.emit(i)"
            class="flex items-center gap-2 rounded-xl py-1.5 text-xs"
            [class.bg-primary/10]="i === activeIndex()"
          >
            <span class="badge badge-ghost font-mono badge-sm"
              >#{{ tag.name }}</span
            >
            <span class="min-w-0 flex-1 truncate text-base-content/70">{{
              tag.description
            }}</span>
          </button>
        </li>
      }
    </ul>
  `,
})
export class ChatTagSuggestionsComponent {
  readonly suggestions = input.required<PromptTag[]>();
  readonly activeIndex = input.required<number>();
  readonly pick = output<string>();
  readonly hover = output<number>();
}
