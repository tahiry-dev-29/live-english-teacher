import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import {
  LucideSquare,
  LucideMic,
  LucideMoreHorizontal,
  LucideCopy,
  LucideRefreshCw,
  LucideGitFork,
} from '@lucide/angular';
import { MESSAGES } from '@core/constants/messages';
import { ChatMessage } from '@models/chat-message.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-item',
  standalone: true,
  imports: [
    CommonModule,
    MarkdownModule,
    LucideSquare,
    LucideMic,
    LucideMoreHorizontal,
    LucideCopy,
    LucideRefreshCw,
    LucideGitFork,
  ],
  template: `
    <div
      class="chat"
      [class.chat-end]="message().role === 'user'"
      [class.chat-start]="message().role === 'ai'"
    >
      <div
        class="group chat-bubble relative max-w-[80%]"
        [class.chat-bubble-primary]="message().role === 'user' && !isError()"
        [class.chat-bubble-neutral]="message().role === 'ai' && !isError()"
        [class.chat-bubble-error]="isError()"
      >
        <!-- Markdown content -->
        <div class="prose-sm prose max-w-none">
          <markdown [data]="message().text"></markdown>
        </div>

        <!-- Error retry button -->
        @if (isError() && message().role === 'ai') {
          <div class="mt-2">
            <button
              (click)="retry.emit()"
              class="btn gap-1 btn-ghost text-error-content btn-xs"
            >
              <svg lucideRefreshCw class="h-3 w-3"></svg>
              Retry
            </button>
          </div>
        }

        <!-- AI message actions -->
        @if (message().role === 'ai' && !isError()) {
          <div class="mt-2 flex items-center gap-1">
            <button
              (click)="handlePlayStop()"
              class="btn gap-1 btn-ghost btn-xs"
              [class.text-primary]="!isPlaying()"
              [class.text-error]="isPlaying()"
            >
              @if (isPlaying()) {
                <svg lucideSquare class="h-3 w-3"></svg>
                <span>Stop</span>
              } @else {
                <svg lucideMic class="h-3 w-3"></svg>
                <span>Listen</span>
              }
            </button>
          </div>
        }

        <!-- Context menu (⋯) on AI messages -->
        @if (message().role === 'ai') {
          <div
            class="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <div class="dropdown dropdown-end">
              <button tabindex="0" class="btn btn-circle btn-ghost btn-xs">
                <svg lucideMoreHorizontal class="h-4 w-4"></svg>
              </button>
              <ul
                tabindex="0"
                class="menu dropdown-content z-50 w-40 rounded-box border border-base-300 bg-base-200 p-2 shadow-lg"
              >
                <li>
                  <button (click)="onCopy()">
                    <svg lucideCopy class="h-4 w-4"></svg>
                    Copy
                  </button>
                </li>
                <li>
                  <button (click)="retry.emit()">
                    <svg lucideRefreshCw class="h-4 w-4"></svg>
                    Retry
                  </button>
                </li>
                <li>
                  <button (click)="handlePlayStop()">
                    <svg lucideMic class="h-4 w-4"></svg>
                    Listen
                  </button>
                </li>
                <li>
                  <button (click)="fork.emit()">
                    <svg lucideGitFork class="h-4 w-4"></svg>
                    Fork
                  </button>
                </li>
              </ul>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .prose {
        color: inherit;
      }

      .prose p {
        margin: 0;
      }

      .prose pre {
        background: oklch(var(--b3));
        padding: 0.75rem;
        border-radius: 0.5rem;
        overflow-x: auto;
      }

      .prose code {
        background: oklch(var(--b3));
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-size: 0.875em;
      }

      .prose pre code {
        background: none;
        padding: 0;
      }
    `,
  ],
})
export class MessageItemComponent {
  readonly message = input.required<ChatMessage>();
  readonly isPlaying = input<boolean>(false);

  readonly playRequested = output<void>();
  readonly stop = output<void>();
  readonly retry = output<void>();
  readonly fork = output<void>();
  readonly copied = output<string>();

  readonly isError = computed<boolean>(() => this.message().kind === 'error');

  handlePlayStop(): void {
    if (this.isPlaying()) {
      this.stop.emit();
    } else {
      this.playRequested.emit();
    }
  }

  async onCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.message().text);
      this.copied.emit(MESSAGES.success.messageCopied);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = this.message().text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
}
