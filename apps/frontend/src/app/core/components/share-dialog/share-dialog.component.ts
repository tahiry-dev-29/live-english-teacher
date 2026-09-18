import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  viewChild,
  ElementRef,
  effect,
  inject,
} from '@angular/core';
import { Session } from '@models/session.model';
import { NotificationService } from '@core/services/notification.service';
import { ChatService } from '@core/services/chat.service';
import {
  LucideX,
  LucideCopy,
  LucideCheck,
  LucideShare2,
  LucideGlobe,
  LucideLink,
  LucideLoader,
} from '@lucide/angular';

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideX,
    LucideCopy,
    LucideCheck,
    LucideShare2,
    LucideGlobe,
    LucideLink,
    LucideLoader,
  ],
  template: `
    <dialog
      #dialog
      id="share-dialog"
      class="modal backdrop-blur-sm"
      (cancel)="onClose()"
    >
      <div
        class="modal-box max-w-md overflow-hidden rounded-3xl border border-base-300 bg-base-200 p-6 shadow-2xl"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between border-b border-base-300 pb-4"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            >
              <svg lucideShare2 class="h-4 w-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-base-content">
                Share link to Chat
              </h3>
              <p
                class="max-w-[240px] truncate text-[11px] text-base-content/50"
              >
                {{ session()?.title || 'Conversation' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-circle btn-ghost text-base-content/60 btn-xs hover:text-base-content"
            (click)="onClose()"
            aria-label="Close dialog"
          >
            <svg lucideX class="h-4 w-4" />
          </button>
        </div>

        <!-- Body description -->
        <div class="space-y-4 py-4 text-xs text-base-content/70">
          <div
            class="flex items-start gap-2.5 rounded-2xl bg-base-300/50 p-3 text-xs leading-relaxed"
          >
            <svg
              lucideGlobe
              class="mt-0.5 h-4 w-4 shrink-0 text-base-content/60"
            />
            <span>
              A read-only snapshot of this conversation is created with a unique
              link. Anyone with this link can view the snapshot — your original
              chat stays private.
            </span>
          </div>

          <!-- Share Link Box -->
          <div class="space-y-1.5">
            <label
              for="shareable-link-input"
              class="text-[11px] font-semibold tracking-wider text-base-content/50 uppercase"
            >
              Shareable Link
            </label>
            <div
              class="flex items-center gap-2 rounded-2xl border border-base-300 bg-base-100 p-1.5"
            >
              <div class="flex min-w-0 flex-1 items-center gap-2 px-2">
                <svg
                  lucideLink
                  class="h-3.5 w-3.5 shrink-0 text-base-content/40"
                />
                @if (isGenerating()) {
                  <span class="text-xs text-base-content/40 italic"
                    >Creating snapshot…</span
                  >
                } @else {
                  <input
                    id="shareable-link-input"
                    type="text"
                    [value]="snapshotUrl()"
                    readonly
                    class="w-full truncate bg-transparent text-xs text-base-content outline-none select-all"
                  />
                }
              </div>
              <button
                type="button"
                (click)="copyLink()"
                [disabled]="isGenerating() || !snapshotUrl()"
                class="btn shrink-0 gap-1.5 rounded-xl px-3 btn-primary btn-sm disabled:opacity-50"
              >
                @if (isGenerating()) {
                  <svg lucideLoader class="h-3.5 w-3.5 animate-spin" />
                  <span>Creating…</span>
                } @else if (isCopied()) {
                  <svg lucideCheck class="h-3.5 w-3.5" />
                  <span>Copied!</span>
                } @else {
                  <svg lucideCopy class="h-3.5 w-3.5" />
                  <span>Copy link</span>
                }
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-2">
          <button
            type="button"
            class="btn rounded-xl btn-ghost text-xs btn-sm"
            (click)="onClose()"
          >
            Done
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit" (click)="onClose()">close</button>
      </form>
    </dialog>
  `,
})
export class ShareDialogComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly chatService = inject(ChatService);

  readonly session = input<Session | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly closed = output<void>();

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly isCopied = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  /** URL of the newly forked snapshot session */
  readonly snapshotUrl = signal<string>('');

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const el = this.dialog()?.nativeElement;
      if (!el) return;

      if (open && !el.open) {
        this.isCopied.set(false);
        this.snapshotUrl.set('');
        el.showModal();
        // Automatically fork the session and generate the share link on dialog open
        void this.generateShareLink();
      } else if (!open && el.open) {
        el.close();
      }
    });
  }

  private async generateShareLink(): Promise<void> {
    const s = this.session();
    if (!s) return;

    this.isGenerating.set(true);
    try {
      const forked = await this.chatService.forkSession(s.id);
      if (forked) {
        const base =
          typeof window !== 'undefined' ? window.location.origin : '';
        this.snapshotUrl.set(`${base}/share/${forked.id}`);
      } else {
        this.notificationService.error(
          'Failed to create share link. Please try again.',
        );
      }
    } finally {
      this.isGenerating.set(false);
    }
  }

  async copyLink(): Promise<void> {
    const url = this.snapshotUrl();
    if (!url) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        this.isCopied.set(true);
        this.notificationService.success('Link copied to clipboard!');
        setTimeout(() => this.isCopied.set(false), 2500);
      }
    } catch {
      // Fallback: silently fail
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}
