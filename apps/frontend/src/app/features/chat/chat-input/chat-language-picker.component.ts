import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import type { Language } from '@features/settings/services/language.service';

/** Learning-language picker (Popover API) — presentation only. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-language-picker',
  standalone: true,
  imports: [LucideChevronDown],
  template: `
    <button
      type="button"
      popovertarget="lang-picker"
      style="anchor-name: --lang-picker"
      class="btn h-9 min-h-0 gap-0.5 rounded-full btn-ghost px-2.5 text-xs font-medium text-base-content/60 btn-sm hover:bg-base-300 hover:text-base-content"
      aria-label="Select learning language"
      aria-haspopup="listbox"
    >
      <span class="text-sm leading-none">{{ currentFlag() }}</span>
      <span class="max-w-24 truncate">{{ currentName() }}</span>
      <svg lucideChevronDown class="h-3.5 w-3.5 shrink-0 opacity-60"></svg>
    </button>
    <ul
      id="lang-picker"
      popover
      role="listbox"
      style="position-anchor: --lang-picker"
      class="menu dropdown dropdown-end dropdown-top max-h-64 w-60 overflow-y-auto rounded-2xl border border-base-300 bg-base-200 p-1.5 shadow-2xl"
    >
      @for (lang of languages(); track lang.code) {
        <li role="option" [attr.aria-selected]="lang.code === selected()">
          <button
            type="button"
            (click)="pick.emit(lang.code)"
            class="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left"
          >
            <span class="flex min-w-0 items-center gap-2">
              <span class="shrink-0">{{ lang.flag }}</span>
              <span class="truncate text-xs font-semibold">{{
                lang.name
              }}</span>
            </span>
            @if (lang.code === selected()) {
              <span class="badge shrink-0 badge-xs badge-primary">Active</span>
            }
          </button>
        </li>
      }
    </ul>
  `,
})
export class ChatLanguagePickerComponent {
  readonly languages = input.required<Language[]>();
  readonly selected = input.required<string>();
  readonly currentFlag = input.required<string>();
  readonly currentName = input.required<string>();
  readonly pick = output<string>();
}
