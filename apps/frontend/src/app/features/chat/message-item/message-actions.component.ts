import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  LucideCheck,
  LucideCopy,
  LucideRefreshCw,
  LucideThumbsDown,
  LucideThumbsUp,
} from '@lucide/angular';
import { MessageActionsMenuComponent } from './message-actions-menu.component';
import { actionBarClasses, copyText } from './message-item.util';

/** AI action bar (Task 92 split): feedback, copy, retry + ⋯ menu. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-actions',
  standalone: true,
  imports: [
    MessageActionsMenuComponent,
    LucideThumbsUp,
    LucideThumbsDown,
    LucideRefreshCw,
    LucideCopy,
    LucideCheck,
  ],
  template: `
    <div [class]="barClasses()">
      <div class="tooltip tooltip-bottom" data-tip="Good response">
        <button
          type="button"
          (click)="toggleLike()"
          class="btn btn-circle btn-ghost text-base-content/60 transition-colors btn-xs hover:text-base-content"
          [class.text-primary]="feedback() === 'liked'"
          aria-label="Good response"
        >
          <svg lucideThumbsUp class="h-3.5 w-3.5"></svg>
        </button>
      </div>

      <div class="tooltip tooltip-bottom" data-tip="Bad response">
        <button
          type="button"
          (click)="toggleDislike()"
          class="btn btn-circle btn-ghost text-base-content/60 transition-colors btn-xs hover:text-base-content"
          [class.text-error]="feedback() === 'disliked'"
          aria-label="Bad response"
        >
          <svg lucideThumbsDown class="h-3.5 w-3.5"></svg>
        </button>
      </div>

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

      <div
        class="tooltip tooltip-bottom"
        [attr.data-tip]="copied() ? 'Copied!' : 'Copy as Markdown'"
      >
        <button
          type="button"
          (click)="onCopy()"
          class="btn btn-circle btn-ghost text-base-content/60 transition-colors btn-xs hover:text-base-content"
          aria-label="Copy as Markdown"
        >
          @if (copied()) {
            <svg lucideCheck class="h-3.5 w-3.5 text-success"></svg>
          } @else {
            <svg lucideCopy class="h-3.5 w-3.5"></svg>
          }
        </button>
      </div>

      <app-message-actions-menu
        [isPlaying]="isPlaying()"
        [copied]="copied()"
        (fork)="fork.emit()"
        (playRequested)="playRequested.emit()"
        (stop)="stop.emit()"
        (copyRequested)="onCopy()"
        (detailsToggled)="detailsToggled.emit()"
      />

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
  `,
})
export class MessageActionsComponent {
  readonly text = input.required<string>();
  readonly isPlaying = input<boolean>(false);

  readonly playRequested = output<void>();
  readonly stop = output<void>();
  readonly retry = output<void>();
  readonly fork = output<void>();
  readonly detailsToggled = output<void>();

  readonly feedback = signal<'liked' | 'disliked' | null>(null);
  readonly copied = signal<boolean>(false);

  protected readonly barClasses = computed(() =>
    actionBarClasses(this.feedback() !== null, this.isPlaying()),
  );

  protected toggleLike(): void {
    this.feedback.update((current) => (current === 'liked' ? null : 'liked'));
  }

  protected toggleDislike(): void {
    this.feedback.update((current) =>
      current === 'disliked' ? null : 'disliked',
    );
  }

  protected async onCopy(): Promise<void> {
    const ok = await copyText(this.text());
    if (!ok) return;
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
