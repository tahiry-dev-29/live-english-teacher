import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import { measureOverflow, COLLAPSED_LINE_COUNT } from './message-item.util';

/**
 * User message bubble (Task 92 split) with the 5-line clamp + Show more
 * toggle from task 83.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-user-bubble',
  standalone: true,
  imports: [MarkdownModule, LucideChevronDown, LucideChevronUp],
  template: `
    <div class="flex w-full min-w-0 justify-end">
      <div
        class="ml-auto max-w-[80%] min-w-0 rounded-3xl bg-base-200 px-5 py-2.5 text-[15px] leading-relaxed [overflow-wrap:anywhere] break-words text-base-content"
      >
        <div
          #userText
          class="md-body max-w-none min-w-0 break-words text-base-content"
          [class.line-clamp-5]="!showFull()"
        >
          <markdown [data]="text()" />
        </div>
        @if (isOverflowing()) {
          <button
            type="button"
            (click)="showFull.set(!showFull())"
            class="btn mt-1 gap-1 rounded-lg btn-ghost text-base-content/60 btn-xs hover:text-base-content"
          >
            @if (showFull()) {
              <svg lucideChevronUp class="h-3 w-3"></svg>
              <span>Show less</span>
            } @else {
              <svg lucideChevronDown class="h-3 w-3"></svg>
              <span>Show more</span>
            }
          </button>
        }
      </div>
    </div>
  `,
})
export class MessageUserBubbleComponent implements AfterViewChecked {
  readonly text = input.required<string>();

  readonly showFull = signal<boolean>(false);
  readonly isOverflowing = signal<boolean>(false);
  readonly collapsedLines = COLLAPSED_LINE_COUNT;

  private readonly userTextEl = viewChild<ElementRef<HTMLElement>>('userText');
  private readonly injector = inject(Injector);
  private measuredHeight = -1;

  constructor() {
    afterNextRender(() => this.measure(), { injector: this.injector });
  }

  /** Re-measure when the text changes (markdown renders async). */
  ngAfterViewChecked(): void {
    this.measure();
  }

  private measure(): void {
    const el = this.userTextEl()?.nativeElement;
    if (!el) return;
    const result = measureOverflow(el, this.measuredHeight);
    if (!result.changed) return;
    this.measuredHeight = result.height;
    if (result.overflowing !== this.isOverflowing()) {
      this.isOverflowing.set(result.overflowing);
    }
  }
}
