import {
  Component,
  input,
  output,
  computed,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import {
  LucideSquare,
  LucideVolume2,
  LucideRefreshCw,
  LucideCopy,
  LucideCheck,
  LucideGitFork,
  LucideThumbsUp,
  LucideThumbsDown,
  LucideEllipsis,
  LucideInfo,
} from '@lucide/angular';
import { ChatMessage } from '@models/chat-message.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-item',
  standalone: true,
  imports: [
    CommonModule,
    MarkdownModule,
    LucideSquare,
    LucideVolume2,
    LucideRefreshCw,
    LucideCopy,
    LucideCheck,
    LucideGitFork,
    LucideThumbsUp,
    LucideThumbsDown,
    LucideEllipsis,
    LucideInfo,
  ],
  template: `
    <div
      class="group mb-4 flex w-full flex-col"
      [class.items-end]="message().role === 'user'"
      [class.items-start]="message().role === 'ai'"
    >
      <!-- Message body -->
      <div
        class="relative max-w-[88%] sm:max-w-[78%]"
        [class.self-end]="message().role === 'user'"
        [class.self-start]="message().role === 'ai'"
      >
        <!-- User Message: Sleek rounded pill container -->
        @if (message().role === 'user') {
          <div
            class="rounded-3xl bg-base-300 px-4 py-2.5 text-sm leading-relaxed text-base-content shadow-xs"
          >
            <div class="prose-sm prose max-w-none text-base-content break-words">
              <markdown [data]="message().text"></markdown>
            </div>
          </div>
        }

        <!-- AI Message: Clean typography with optional error styling -->
        @if (message().role === 'ai') {
          <div
            class="rounded-2xl px-1 py-1 text-sm leading-relaxed text-base-content"
            [class.border]="isError()"
            [class.border-error/40]="isError()"
            [class.bg-error/10]="isError()"
            [class.p-3]="isError()"
          >
            <div class="prose-sm prose max-w-none text-base-content break-words">
              <markdown [data]="message().text"></markdown>
            </div>
          </div>

          <!-- Error retry button -->
          @if (isError()) {
            <div class="mt-2 flex items-center gap-2">
              <button
                type="button"
                (click)="retry.emit()"
                class="btn gap-1.5 btn-error btn-xs rounded-lg"
              >
                <svg lucideRefreshCw class="h-3 w-3"></svg>
                <span>Retry</span>
              </button>
              <span class="text-xs text-error">Failed to get response</span>
            </div>
          }

          <!-- AI Action Bar (ThumbsUp, ThumbsDown, Retry, Copy, Ellipsis dropdown) -->
          @if (!isError()) {
            <div class="mt-2 flex items-center gap-0.5 text-base-content/60">
              <!-- Thumbs up -->
              <div class="tooltip tooltip-bottom" data-tip="Good response">
                <button
                  type="button"
                  (click)="toggleLike()"
                  class="btn btn-circle btn-ghost btn-xs text-base-content/60 hover:text-base-content transition-colors"
                  [class.text-primary]="feedbackState() === 'liked'"
                  aria-label="Good response"
                >
                  <svg lucideThumbsUp class="h-3.5 w-3.5"></svg>
                </button>
              </div>

              <!-- Thumbs down -->
              <div class="tooltip tooltip-bottom" data-tip="Bad response">
                <button
                  type="button"
                  (click)="toggleDislike()"
                  class="btn btn-circle btn-ghost btn-xs text-base-content/60 hover:text-base-content transition-colors"
                  [class.text-error]="feedbackState() === 'disliked'"
                  aria-label="Bad response"
                >
                  <svg lucideThumbsDown class="h-3.5 w-3.5"></svg>
                </button>
              </div>

              <!-- Retry / Regenerate -->
              <div class="tooltip tooltip-bottom" data-tip="Regenerate">
                <button
                  type="button"
                  (click)="retry.emit()"
                  class="btn btn-circle btn-ghost btn-xs text-base-content/60 hover:text-base-content transition-colors"
                  aria-label="Regenerate"
                >
                  <svg lucideRefreshCw class="h-3.5 w-3.5"></svg>
                </button>
              </div>

              <!-- Copy -->
              <div
                class="tooltip tooltip-bottom"
                [attr.data-tip]="isCopied() ? 'Copied!' : 'Copy'"
              >
                <button
                  type="button"
                  (click)="onCopyText()"
                  class="btn btn-circle btn-ghost btn-xs text-base-content/60 hover:text-base-content transition-colors"
                  aria-label="Copy"
                >
                  @if (isCopied()) {
                    <svg lucideCheck class="h-3.5 w-3.5 text-success"></svg>
                  } @else {
                    <svg lucideCopy class="h-3.5 w-3.5"></svg>
                  }
                </button>
              </div>

              <!-- ⋯ Three dots menu dropdown (opens rightwards to avoid clipping) -->
              <div class="dropdown dropdown-start dropdown-bottom">
                <div class="tooltip tooltip-bottom" data-tip="More">
                  <button
                    tabindex="0"
                    type="button"
                    class="btn btn-circle btn-ghost btn-xs text-base-content/60 hover:text-base-content transition-colors"
                    aria-label="More options"
                  >
                    <svg lucideEllipsis class="h-3.5 w-3.5"></svg>
                  </button>
                </div>
                <ul
                  tabindex="0"
                  class="menu dropdown-content z-50 mt-1 w-52 rounded-2xl border border-base-300 bg-base-200/95 p-1.5 shadow-2xl backdrop-blur-md"
                >
                  <!-- Branch in new chat -->
                  <li>
                    <button
                      type="button"
                      (click)="fork.emit()"
                      class="flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-base-content hover:bg-base-300"
                    >
                      <svg lucideGitFork class="h-4 w-4 text-base-content/70"></svg>
                      <span>Branch in new chat</span>
                    </button>
                  </li>

                  <!-- Listen / Stop -->
                  <li>
                    <button
                      type="button"
                      (click)="handlePlayStop()"
                      class="flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-base-content hover:bg-base-300"
                    >
                      @if (isPlaying()) {
                        <svg lucideSquare class="h-4 w-4 text-error"></svg>
                        <span class="text-error font-semibold">Stop audio</span>
                      } @else {
                        <svg lucideVolume2 class="h-4 w-4 text-base-content/70"></svg>
                        <span>Listen</span>
                      }
                    </button>
                  </li>

                  <!-- Copy text in menu -->
                  <li>
                    <button
                      type="button"
                      (click)="onCopyText()"
                      class="flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-base-content hover:bg-base-300"
                    >
                      <svg lucideCopy class="h-4 w-4 text-base-content/70"></svg>
                      <span>{{ isCopied() ? 'Copied!' : 'Copy response' }}</span>
                    </button>
                  </li>

                  <!-- Details -->
                  <li>
                    <button
                      type="button"
                      (click)="toggleDetails()"
                      class="flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-base-content hover:bg-base-300"
                    >
                      <svg lucideInfo class="h-4 w-4 text-base-content/70"></svg>
                      <span>See response details</span>
                    </button>
                  </li>
                </ul>
              </div>

              <!-- Audio playing status indicator -->
              @if (isPlaying()) {
                <span class="ml-2 flex items-center gap-1.5 text-xs text-secondary font-medium animate-pulse">
                  <span class="loading loading-spinner loading-xs text-secondary"></span>
                  Playing audio…
                </span>
              }
            </div>

            <!-- Optional details drawer/card -->
            @if (showDetails()) {
              <div
                class="mt-2 rounded-xl border border-base-300 bg-base-200/60 p-3 text-xs text-base-content/70"
              >
                <div class="flex items-center justify-between pb-1.5 border-b border-base-300">
                  <span class="font-semibold text-base-content">Response Details</span>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-[10px]"
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
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .prose {
        color: inherit;
      }

      .prose p {
        margin: 0;
      }

      .prose pre {
        background: var(--color-base-300);
        padding: 0.75rem;
        border-radius: var(--radius-box);
        overflow-x: auto;
      }

      .prose code {
        background: var(--color-base-300);
        padding: 0.125rem 0.25rem;
        border-radius: var(--radius-field);
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
  readonly retry = output<number | void>();
  readonly fork = output<void>();

  readonly isError = computed<boolean>(() => this.message().kind === 'error');
  readonly isCopied = signal<boolean>(false);
  readonly feedbackState = signal<'liked' | 'disliked' | null>(null);
  readonly showDetails = signal<boolean>(false);

  handlePlayStop(): void {
    if (this.isPlaying()) {
      this.stop.emit();
    } else {
      this.playRequested.emit();
    }
  }

  toggleLike(): void {
    this.feedbackState.update((current) =>
      current === 'liked' ? null : 'liked',
    );
  }

  toggleDislike(): void {
    this.feedbackState.update((current) =>
      current === 'disliked' ? null : 'disliked',
    );
  }

  toggleDetails(): void {
    this.showDetails.update((v) => !v);
  }

  async onCopyText(): Promise<void> {
    const text = this.message().text;
    if (!text) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2000);
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand?.('copy');
      document.body.removeChild(textarea);
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    }
  }
}


