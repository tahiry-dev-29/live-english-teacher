import { Component, input, output, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import {
  LucideSquare, LucideMic, LucideMoreHorizontal,
  LucideCopy, LucideRefreshCw, LucideGitFork,
} from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-item',
  standalone: true,
  imports: [
    CommonModule,
    MarkdownModule,
    LucideSquare, LucideMic, LucideMoreHorizontal,
    LucideCopy, LucideRefreshCw, LucideGitFork,
  ],
  template: `
    <div
      class="chat"
      [class.chat-end]="message().role === 'user'"
      [class.chat-start]="message().role === 'ai'"
    >
      <div
        class="chat-bubble max-w-[80%] relative group"
        [class.chat-bubble-primary]="message().role === 'user' && !isError()"
        [class.chat-bubble-neutral]="message().role === 'ai' && !isError()"
        [class.chat-bubble-error]="isError()"
      >
        <!-- Markdown content -->
        <div class="prose prose-sm max-w-none">
          <markdown [data]="message().text"></markdown>
        </div>

        <!-- Error retry button -->
        @if (isError() && message().role === 'ai') {
        <div class="mt-2">
          <button
            (click)="retry.emit()"
            class="btn btn-ghost btn-xs gap-1 text-error-content"
          >
            <svg lucideRefreshCw class="w-3 h-3"></svg>
            Retry
          </button>
        </div>
        }

        <!-- AI message actions -->
        @if (message().role === 'ai' && !isError()) {
        <div class="mt-2 flex items-center gap-1">
          <button
            (click)="handlePlayStop()"
            class="btn btn-ghost btn-xs gap-1"
            [class.text-primary]="!isPlaying()"
            [class.text-error]="isPlaying()"
          >
            @if (isPlaying()) {
            <svg lucideSquare class="w-3 h-3"></svg>
            <span>Stop</span>
            } @else {
            <svg lucideMic class="w-3 h-3"></svg>
            <span>Listen</span>
            }
          </button>
        </div>
        }

        <!-- Context menu (⋯) on AI messages -->
        @if (message().role === 'ai') {
        <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="dropdown dropdown-end">
            <button tabindex="0" class="btn btn-ghost btn-xs btn-circle">
              <svg lucideMoreHorizontal class="w-4 h-4"></svg>
            </button>
            <ul tabindex="0" class="dropdown-content menu bg-base-200 border border-base-300 rounded-box z-50 w-40 p-2 shadow-lg">
              <li>
                <button (click)="onCopy()">
                  <svg lucideCopy class="w-4 h-4"></svg>
                  Copy
                </button>
              </li>
              <li>
                <button (click)="retry.emit()">
                  <svg lucideRefreshCw class="w-4 h-4"></svg>
                  Retry
                </button>
              </li>
              <li>
                <button (click)="handlePlayStop()">
                  <svg lucideMic class="w-4 h-4"></svg>
                  Listen
                </button>
              </li>
              <li>
                <button (click)="fork.emit()">
                  <svg lucideGitFork class="w-4 h-4"></svg>
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
  readonly message = input.required<{ role: 'user' | 'ai'; text: string }>();
  readonly isPlaying = input<boolean>(false);

  readonly playRequested = output<void>();
  readonly stop = output<void>();
  readonly retry = output<void>();
  readonly fork = output<void>();
  readonly copied = output<void>();

  readonly isError = computed<boolean>(() => {
    return this.message().text.startsWith('Error:');
  });

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
      this.copied.emit();
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
