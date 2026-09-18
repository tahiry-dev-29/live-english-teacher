import {
  Component,
  input,
  output,
  computed,
  signal,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
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
      class="group flex w-full min-w-0 flex-col"
      [class.items-end]="message().role === 'user'"
      [class.items-start]="message().role === 'ai'"
    >
      <div class="w-full max-w-full min-w-0">
        @if (message().role === 'user') {
          <div class="flex w-full min-w-0 justify-end">
            <div
              class="ml-auto max-w-[80%] min-w-0 rounded-3xl bg-base-200 px-5 py-2.5 text-[15px] leading-relaxed [overflow-wrap:anywhere] break-words text-base-content"
            >
              <div
                class="prose-sm prose max-w-none min-w-0 [overflow-wrap:anywhere] break-words text-base-content"
              >
                <markdown [data]="message().text" />
              </div>
            </div>
          </div>
        }

        @if (message().role === 'ai') {
          <div
            class="w-full max-w-full min-w-0 text-[15px] leading-7 [overflow-wrap:anywhere] break-words text-base-content"
            [class.border]="isError()"
            [class.border-error/40]="isError()"
            [class.bg-error/10]="isError()"
            [class.p-3]="isError()"
            [class.rounded-2xl]="isError()"
          >
            <div
              class="prose-chat max-w-none min-w-0 [overflow-wrap:anywhere] break-words"
            >
              <markdown [data]="message().text" />
            </div>
          </div>

          <!-- Error retry button -->
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

          <!-- AI Action Bar (ThumbsUp, ThumbsDown, Retry, Copy, Ellipsis dropdown) -->
          @if (!isError()) {
            <div
              class="mt-2 flex min-w-0 flex-wrap items-center gap-0.5 text-base-content/60"
            >
              <!-- Thumbs up -->
              <div class="tooltip tooltip-bottom" data-tip="Good response">
                <button
                  type="button"
                  (click)="toggleLike()"
                  class="btn btn-circle btn-ghost text-base-content/60 transition-colors btn-xs hover:text-base-content"
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
                  class="btn btn-circle btn-ghost text-base-content/60 transition-colors btn-xs hover:text-base-content"
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
                  class="btn btn-circle btn-ghost text-base-content/60 transition-colors btn-xs hover:text-base-content"
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
                  class="btn btn-circle btn-ghost text-base-content/60 transition-colors btn-xs hover:text-base-content"
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
              <div
                class="dropdown dropdown-end"
                [class.dropdown-top]="menuUp()"
                [class.dropdown-bottom]="!menuUp()"
              >
                <div
                  class="tooltip"
                  [class.tooltip-top]="menuUp()"
                  [class.tooltip-bottom]="!menuUp()"
                  data-tip="More"
                >
                  <button
                    #menuTrigger
                    tabindex="0"
                    type="button"
                    (click)="openMenu()"
                    class="btn btn-circle btn-ghost text-base-content/60 transition-colors btn-xs hover:text-base-content"
                    aria-label="More options"
                    aria-haspopup="menu"
                  >
                    <svg lucideEllipsis class="h-3.5 w-3.5"></svg>
                  </button>
                </div>
                <ul
                  tabindex="0"
                  role="menu"
                  (click)="closeMenu()"
                  (keydown.escape)="closeMenu()"
                  class="menu dropdown-content z-50 mt-1 w-52 rounded-2xl border border-base-300 bg-base-200/95 p-1.5 shadow-2xl backdrop-blur-md"
                >
                  <!-- Branch in new chat -->
                  <li>
                    <button
                      type="button"
                      (click)="fork.emit()"
                      class="flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-base-content hover:bg-base-300"
                    >
                      <svg
                        lucideGitFork
                        class="h-4 w-4 text-base-content/70"
                      ></svg>
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
                        <span class="font-semibold text-error">Stop audio</span>
                      } @else {
                        <svg
                          lucideVolume2
                          class="h-4 w-4 text-base-content/70"
                        ></svg>
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
                      <svg
                        lucideCopy
                        class="h-4 w-4 text-base-content/70"
                      ></svg>
                      <span>{{
                        isCopied() ? 'Copied!' : 'Copy response'
                      }}</span>
                    </button>
                  </li>

                  <!-- Details -->
                  <li>
                    <button
                      type="button"
                      (click)="toggleDetails()"
                      class="flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-base-content hover:bg-base-300"
                    >
                      <svg
                        lucideInfo
                        class="h-4 w-4 text-base-content/70"
                      ></svg>
                      <span>See response details</span>
                    </button>
                  </li>
                </ul>
              </div>

              <!-- Audio playing status indicator -->
              @if (isPlaying()) {
                <span
                  class="ml-2 flex animate-pulse items-center gap-1.5 text-xs font-medium text-secondary"
                >
                  <span
                    class="loading loading-xs loading-spinner text-secondary"
                  ></span>
                  Playing audio…
                </span>
              }
            </div>

            <!-- Optional details drawer/card -->
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

      /* Anti-horizontal-scroll: no content block may exceed the message width
         (long AI text, unbreakable words/URLs, code). */
      .prose-chat,
      .prose-chat *,
      .prose,
      .prose * {
        max-width: 100%;
        min-width: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .prose-chat img,
      .prose-chat video,
      .prose-chat iframe,
      .prose img,
      .prose video,
      .prose iframe {
        height: auto;
        border-radius: var(--radius-field);
      }

      .prose-chat table,
      .prose table {
        display: block;
        width: 100%;
        overflow-x: auto;
      }

      .prose-chat pre,
      .prose pre {
        max-width: 100%;
        overflow-x: auto;
      }

      .prose-chat {
        color: inherit;
        font-size: 15px;
        line-height: 1.75;
      }

      .prose-chat p {
        margin: 0 0 1em;
      }

      .prose-chat p:last-child {
        margin-bottom: 0;
      }

      .prose-chat h1,
      .prose-chat h2,
      .prose-chat h3,
      .prose-chat h4,
      .prose-chat h5,
      .prose-chat h6 {
        color: inherit;
        font-weight: 700;
        margin: 1.25em 0 0.5em;
        line-height: 1.3;
      }

      .prose-chat h1 {
        font-size: 1.35em;
      }
      .prose-chat h2 {
        font-size: 1.2em;
      }
      .prose-chat h3 {
        font-size: 1.1em;
      }
      .prose-chat h4 {
        font-size: 1em;
      }

      .prose-chat ul {
        margin: 0.75em 0;
        padding-left: 1.25rem;
        list-style: disc;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .prose-chat ol {
        margin: 0.75em 0;
        padding-left: 1.25rem;
        list-style: decimal;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .prose-chat li::marker {
        color: var(--color-primary);
        opacity: 0.8;
      }

      .prose-chat strong {
        font-weight: 600;
        color: inherit;
      }

      .prose-chat em {
        font-style: italic;
        color: inherit;
      }

      .prose-chat a {
        color: var(--color-primary);
        text-decoration: underline;
        text-underline-offset: 3px;
        transition: opacity 0.15s;
      }

      .prose-chat a:hover {
        opacity: 0.8;
      }

      .prose-chat hr {
        margin: 1.25em 0;
        border: none;
        border-top: 1px solid var(--color-base-300);
      }

      .prose-chat blockquote {
        margin: 0.85em 0;
        padding: 0.5rem 0.9rem;
        border-left: 3px solid var(--color-primary);
        background: color-mix(in oklch, var(--color-primary) 6%, transparent);
        border-radius: 0 var(--radius-field) var(--radius-field) 0;
        color: inherit;
      }

      .prose-chat code {
        background: color-mix(
          in oklch,
          var(--color-base-content) 8%,
          transparent
        );
        color: var(--color-primary);
        padding: 0.15rem 0.4rem;
        border-radius: var(--radius-field);
        font-size: 0.875em;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      .prose-chat pre {
        background: var(--color-base-200);
        border: 1px solid var(--color-base-300);
        padding: 0.9rem 1rem;
        border-radius: var(--radius-box);
        overflow-x: auto;
        margin: 0.85em 0;
      }

      .prose-chat pre code {
        background: none;
        padding: 0;
        color: inherit;
        font-size: 0.875em;
      }

      /* Markdown Tables */
      .prose-chat table {
        width: 100%;
        margin: 1em 0;
        border-collapse: collapse;
        font-size: 0.9em;
        border-radius: var(--radius-box);
        overflow: hidden;
        border: 1px solid var(--color-base-300);
      }

      .prose-chat th {
        background: var(--color-base-200);
        font-weight: 600;
        text-align: left;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--color-base-300);
      }

      .prose-chat td {
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--color-base-300);
      }

      .prose-chat tr:last-child td {
        border-bottom: none;
      }

      .prose-chat tr:hover td {
        background: color-mix(
          in oklch,
          var(--color-base-content) 3%,
          transparent
        );
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
  readonly menuUp = signal<boolean>(true);

  private readonly menuTrigger =
    viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');

  openMenu(): void {
    const el = this.menuTrigger()?.nativeElement;
    if (!el) {
      this.menuUp.set(true);
      return;
    }
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    this.menuUp.set(spaceBelow < 260);
    requestAnimationFrame(() => el.focus());
  }

  closeMenu(): void {
    this.menuTrigger()?.nativeElement?.blur();
  }

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
