import {
  Component,
  input,
  output,
  computed,
  signal,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
  afterNextRender,
  AfterViewChecked,
  Injector,
  inject,
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
  LucideInfo,
  LucideChevronDown,
  LucideChevronUp,
} from '@lucide/angular';
import { ChatMessage } from '@models/chat-message.model';
import { AppDropdownMenuComponent } from '@core/components/ui/dropdown-menu/dropdown-menu.component';

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
    LucideInfo,
    LucideChevronDown,
    LucideChevronUp,
    AppDropdownMenuComponent,
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
                #userText
                class="md-body max-w-none min-w-0 break-words text-base-content"
                [class.line-clamp-5]="!showFullUserText()"
              >
                <markdown [data]="message().text" />
              </div>
              @if (isUserTextOverflowing()) {
                <button
                  type="button"
                  (click)="showFullUserText.set(!showFullUserText())"
                  class="btn mt-1 gap-1 rounded-lg btn-ghost text-base-content/60 btn-xs hover:text-base-content"
                >
                  @if (showFullUserText()) {
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
            <div class="md-body max-w-none min-w-0 break-words">
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

          <!-- AI Action Bar (ThumbsUp, ThumbsDown, Retry, Copy, Ellipsis dropdown)
               Hidden by default, revealed on hover/focus — 100% Tailwind
               utilities built in actionBarClasses(). Opacity-only fade (no
               translate) so the bar never shifts layout or creates a
               scrollbar. Always visible on touch (pointer-coarse) and while
               feedback/audio is active. -->
          @if (!isError()) {
            <div [class]="actionBarClasses()">
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
                [attr.data-tip]="isCopied() ? 'Copied!' : 'Copy as Markdown'"
              >
                <button
                  type="button"
                  (click)="onCopyText()"
                  class="btn btn-circle btn-ghost text-base-content/60 transition-colors btn-xs hover:text-base-content"
                  aria-label="Copy as Markdown"
                >
                  @if (isCopied()) {
                    <svg lucideCheck class="h-3.5 w-3.5 text-success"></svg>
                  } @else {
                    <svg lucideCopy class="h-3.5 w-3.5"></svg>
                  }
                </button>
              </div>

              <!-- ⋯ Three dots menu — canonical reusable dropdown (task 89) -->
              <app-dropdown-menu triggerLabel="More options">
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
                    <svg lucideCopy class="h-4 w-4 text-base-content/70"></svg>
                    <span>{{
                      isCopied() ? 'Copied!' : 'Copy as Markdown'
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
                    <svg lucideInfo class="h-4 w-4 text-base-content/70"></svg>
                    <span>See response details</span>
                  </button>
                </li>
              </app-dropdown-menu>

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
export class MessageItemComponent implements AfterViewChecked {
  /**
   * AI action bar classes — 100% Tailwind utilities.
   * Hidden by default (opacity-0 + pointer-events-none), revealed when the
   * pointer hovers the message (`group-hover:` — the root div is the
   * `group`), when the bar receives keyboard focus (`focus-within:`), or
   * while feedback/audio is active. Opacity-only fade: no translate, so
   * nothing shifts and no horizontal scrollbar can appear.
   * `pointer-coarse:` keeps the bar always visible on touch devices.
   */
  readonly actionBarClasses = computed(() => {
    const isVisible = this.feedbackState() !== null || this.isPlaying();
    return [
      'mt-2 flex min-w-0 flex-wrap items-center gap-0.5 text-base-content/60',
      'opacity-0 pointer-events-none transition-opacity duration-200',
      'group-hover:opacity-100 group-hover:pointer-events-auto',
      'focus-within:opacity-100 focus-within:pointer-events-auto',
      'pointer-coarse:opacity-100 pointer-coarse:pointer-events-auto',
      isVisible ? 'opacity-100 pointer-events-auto' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });

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

  /** Show more/less (task 83): user bubbles clamp to 5 lines when overflowing. */
  readonly showFullUserText = signal<boolean>(false);
  readonly isUserTextOverflowing = signal<boolean>(false);
  private readonly userTextEl = viewChild<ElementRef<HTMLElement>>('userText');
  private readonly injector = inject(Injector);

  constructor() {
    afterNextRender(() => this.measureUserTextOverflow(), {
      injector: this.injector,
    });
  }

  /** Re-measure when the text changes (markdown renders async). */
  ngAfterViewChecked(): void {
    this.measureUserTextOverflow();
  }

  private userTextMeasuredHeight = -1;

  private measureUserTextOverflow(): void {
    const el = this.userTextEl()?.nativeElement;
    if (!el) return;
    // Skip re-measure when height is unchanged (avoids signal write loops).
    if (el.scrollHeight === this.userTextMeasuredHeight) return;
    this.userTextMeasuredHeight = el.scrollHeight;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '0');
    const maxLines = 5;
    const overflowing =
      lineHeight > 0
        ? el.scrollHeight > lineHeight * maxLines + 2
        : el.scrollHeight > el.clientHeight + 2;
    if (overflowing !== this.isUserTextOverflowing()) {
      this.isUserTextOverflowing.set(overflowing);
    }
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
