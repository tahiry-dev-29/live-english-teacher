import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { ChatMessage } from '@models/chat-message.model';
import { MessageAiBubbleComponent } from './message-ai-bubble.component';
import { MessageUserBubbleComponent } from './message-user-bubble.component';
import { MessageActionsComponent } from './message-actions.component';

/**
 * One chat message row (Task 92 split): user/AI bubble + AI action bar.
 * Measurements live in the bubbles, action logic in MessageActionsComponent.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-item',
  standalone: true,
  imports: [
    MessageUserBubbleComponent,
    MessageAiBubbleComponent,
    MessageActionsComponent,
  ],
  template: `
    <div
      class="group flex w-full min-w-0 flex-col"
      [class.items-end]="isUser()"
      [class.items-start]="!isUser()"
    >
      <div class="w-full max-w-full min-w-0">
        @if (isUser()) {
          <app-message-user-bubble [text]="message().text" />
        } @else {
          <app-message-ai-bubble
            [text]="message().text"
            [isError]="isError()"
            [isStreaming]="isStreaming()"
            (retry)="retry.emit()"
          />

          @if (!isError()) {
            <app-message-actions
              [text]="message().text"
              [isPlaying]="isPlaying()"
              (playRequested)="playRequested.emit()"
              (stop)="stop.emit()"
              (retry)="retry.emit()"
              (fork)="fork.emit()"
              (detailsToggled)="showDetails.set(!showDetails())"
            />
          }

          @if (showDetails()) {
            <div
              class="mt-2 rounded-xl border border-base-300 bg-base-200/60 p-3 text-xs text-base-content/70"
            >
              <div
                class="flex items-center justify-between border-b border-base-300 pb-1.5"
              >
                <span class="font-semibold text-base-content"
                  >Response Details</span
                >
                <button
                  type="button"
                  class="btn btn-ghost text-[10px] btn-xs"
                  (click)="showDetails.set(false)"
                >
                  Close
                </button>
              </div>
              <div class="mt-2 space-y-1 font-mono text-[11px]">
                <p>Length: {{ message().text.length }} characters</p>
                <p>Role: AI Language Tutor</p>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        overflow-x: hidden;
      }

      /* Generated markdown nodes (<markdown>, table, headings, code…) are NOT
         reachable from this scoped stylesheet: Angular only stamps
         _ngcontent-* on elements authored in this template. Every markdown
         typography rule lives in the global stylesheet
         apps/frontend/src/styles/markdown.css (class .md-body). */
      .md-body {
        min-width: 0;
      }
    `,
  ],
})
export class MessageItemComponent {
  readonly message = input.required<ChatMessage>();
  readonly isPlaying = input<boolean>(false);
  /** Live SSE cursor on the bubble currently receiving tokens. */
  readonly isStreaming = input<boolean>(false);

  readonly playRequested = output<void>();
  readonly stop = output<void>();
  readonly retry = output<number | void>();
  readonly fork = output<void>();

  readonly isUser = computed<boolean>(() => this.message().role === 'user');
  readonly isError = computed<boolean>(() => this.message().kind === 'error');
  readonly showDetails = signal<boolean>(false);
}
