import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { LucideRefreshCw } from '@lucide/angular';

/** AI message bubble (Task 92 split): error styling + live streaming cursor. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-ai-bubble',
  standalone: true,
  imports: [MarkdownModule, LucideRefreshCw],
  template: `
    <div
      class="w-full max-w-full min-w-0 text-[15px] leading-7 [overflow-wrap:anywhere] break-words text-base-content"
      [class.border]="isError()"
      [class.border-error/40]="isError()"
      [class.bg-error/10]="isError()"
      [class.p-3]="isError()"
      [class.rounded-2xl]="isError()"
    >
      <div class="md-body max-w-none min-w-0 break-words">
        <markdown [data]="text()" />
        @if (isStreaming()) {
          <span
            class="streaming-cursor ml-0.5 inline-block h-4 w-[7px] animate-pulse rounded-[2px] bg-primary align-middle"
            aria-hidden="true"
          ></span>
        }
      </div>
    </div>

    @if (isError()) {
      <div class="mt-2 flex items-center gap-2">
        <button
          type="button"
          (click)="retry.emit()"
          class="btn gap-1.5 rounded-lg btn-error btn-xs"
        >
          <svg lucideRefreshCw class="h-3 w-3"></svg>
          <span>Retry</span>
        </button>
        <span class="text-xs text-error">Failed to get response</span>
      </div>
    }
  `,
})
export class MessageAiBubbleComponent {
  readonly text = input.required<string>();
  readonly isError = input<boolean>(false);
  readonly isStreaming = input<boolean>(false);

  readonly retry = output<void>();
}
