import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LucideExpand, LucideShrink } from '@lucide/angular';
import { PromptTag } from '@core/services/prompt-tag.service';
import { ChatTagSuggestionsComponent } from './chat-tag-suggestions.component';
import {
  INPUT_LONG_TEXT_THRESHOLD_PX,
  computeInputHeight,
} from './chat-input.util';

/**
 * Composer text field (Task 92 split): autosize + expand toggle + #tag list.
 * Owns the textarea DOM; the parent owns tag detection and sending.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-composer-field',
  standalone: true,
  imports: [LucideExpand, LucideShrink, ChatTagSuggestionsComponent],
  template: `
    <div class="relative">
      @if (isRecording()) {
        <div class="flex min-h-12 items-center gap-2 text-error">
          <span class="loading loading-sm loading-dots"></span>
          <span class="text-sm font-medium">Recording…</span>
        </div>
      } @else {
        <textarea
          #composer
          rows="1"
          [value]="value()"
          (input)="onInput($any($event.target).value)"
          (keydown)="composerKeydown.emit($event)"
          placeholder="Ask anything"
          [disabled]="disabled()"
          aria-label="Message input"
          class="max-h-80 min-h-12 w-full min-w-0 resize-none border-0 bg-transparent pr-8 text-[15px] leading-6 break-words text-base-content outline-none placeholder:text-base-content/40 focus:border-0 focus:ring-0 disabled:opacity-50"
        ></textarea>

        @if (suggestions().length > 0) {
          <app-chat-tag-suggestions
            [suggestions]="suggestions()"
            [activeIndex]="activeIndex()"
            (pick)="tagPicked.emit($event)"
            (hover)="activeIndexChange.emit($event)"
          />
        }

        @if (canExpand() || expanded()) {
          <button
            type="button"
            (click)="toggleExpanded()"
            class="btn absolute top-0 right-0 btn-circle h-6 min-h-0 w-6 btn-ghost text-base-content/30 btn-xs hover:text-base-content"
            [attr.aria-label]="expanded() ? 'Collapse input' : 'Expand input'"
            [attr.aria-expanded]="expanded()"
            [title]="expanded() ? 'Collapse' : 'Expand'"
          >
            @if (expanded()) {
              <svg lucideShrink class="h-3.5 w-3.5"></svg>
            } @else {
              <svg lucideExpand class="h-3.5 w-3.5"></svg>
            }
          </button>
        }
      }
    </div>
  `,
})
export class ChatComposerFieldComponent {
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly isRecording = input<boolean>(false);
  readonly suggestions = input<PromptTag[]>([]);
  readonly activeIndex = input<number>(0);

  readonly valueChange = output<string>();
  readonly composerKeydown = output<KeyboardEvent>();
  readonly tagPicked = output<string>();
  readonly activeIndexChange = output<number>();

  private readonly composer =
    viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  protected readonly expanded = signal<boolean>(false);
  protected readonly canExpand = signal<boolean>(false);

  constructor() {
    effect(() => {
      // Track value + expanded, then autosize outside the reactive context
      // so canExpand.set() does not re-trigger this effect.
      this.value();
      this.expanded();
      untracked(() => requestAnimationFrame(() => this.autosize()));
    });
  }

  /** Focuses the textarea and places the caret (used after tag insertion). */
  focusAt(caret: number): void {
    requestAnimationFrame(() => {
      const el = this.composer()?.nativeElement;
      if (!el) return;
      try {
        el.focus();
        el.setSelectionRange(caret, caret);
      } catch {
        // ignore — focus is best-effort after tag insertion
      }
    });
  }

  caretPosition(): number {
    return this.composer()?.nativeElement.selectionStart ?? this.value().length;
  }

  private autosize(): void {
    const el = this.composer()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    const contentHeight = el.scrollHeight;
    untracked(() =>
      this.canExpand.set(contentHeight > INPUT_LONG_TEXT_THRESHOLD_PX),
    );
    el.style.height = `${computeInputHeight(contentHeight, this.expanded())}px`;
  }

  protected onInput(text: string): void {
    this.valueChange.emit(text);
  }

  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  protected readonly hasSuggestions = computed(
    () => this.suggestions().length > 0,
  );
}
