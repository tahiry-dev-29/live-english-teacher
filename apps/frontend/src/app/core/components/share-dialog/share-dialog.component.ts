import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  viewChild,
  ElementRef,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Session } from '@models/session.model';
import { NotificationService } from '@core/services/notification.service';
import {
  LucideX,
  LucideCopy,
  LucideCheck,
  LucideShare2,
  LucideGlobe,
  LucideLink,
} from '@lucide/angular';

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideX,
    LucideCopy,
    LucideCheck,
    LucideShare2,
    LucideGlobe,
    LucideLink,
  ],
  template: `
    <dialog #dialog id="share-dialog" class="modal" (cancel)="onClose()">
      <div class="modal-box max-w-md overflow-hidden rounded-3xl border border-base-300 bg-base-200 p-6 shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-base-300">
          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <svg lucideShare2 class="h-4 w-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-base-content">Share link to Chat</h3>
              <p class="text-[11px] text-base-content/50 truncate max-w-[240px]">
                {{ session()?.title || 'Conversation' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-xs text-base-content/60 hover:text-base-content"
            (click)="onClose()"
            aria-label="Close dialog"
          >
            <svg lucideX class="h-4 w-4" />
          </button>
        </div>

        <!-- Body description -->
        <div class="py-4 space-y-4 text-xs text-base-content/70">
          <div class="flex items-start gap-2.5 rounded-2xl bg-base-300/50 p-3 text-xs leading-relaxed">
            <svg lucideGlobe class="h-4 w-4 shrink-0 text-base-content/60 mt-0.5" />
            <span>
              Anyone with this link will be able to view this conversation snapshot.
            </span>
          </div>

          <!-- Share Link Box -->
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
              Shareable Link
            </label>
            <div class="flex items-center gap-2 rounded-2xl border border-base-300 bg-base-100 p-1.5">
              <div class="flex flex-1 items-center gap-2 px-2">
                <svg lucideLink class="h-3.5 w-3.5 text-base-content/40 shrink-0" />
                <input
                  type="text"
                  [value]="shareUrl()"
                  readonly
                  class="w-full bg-transparent text-xs text-base-content select-all outline-none"
                />
              </div>
              <button
                type="button"
                (click)="copyLink()"
                class="btn btn-primary btn-sm rounded-xl gap-1.5 px-3"
              >
                @if (isCopied()) {
                  <svg lucideCheck class="h-3.5 w-3.5" />
                  <span>Copied!</span>
                } @else {
                  <svg lucideCopy class="h-3.5 w-3.5" />
                  <span>Copy</span>
                }
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-2">
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-xl text-xs"
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

  readonly session = input<Session | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly closed = output<void>();

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly isCopied = signal<boolean>(false);

  readonly shareUrl = computed<string>(() => {
    const s = this.session();
    if (!s) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/share/${s.id}`;
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const el = this.dialog()?.nativeElement;
      if (!el) return;

      if (open && !el.open) {
        this.isCopied.set(false);
        el.showModal();
      } else if (!open && el.open) {
        el.close();
      }
    });
  }

  async copyLink(): Promise<void> {
    const url = this.shareUrl();
    if (!url) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        this.isCopied.set(true);
        this.notificationService.success('Link copied to clipboard!');
        setTimeout(() => this.isCopied.set(false), 2500);
      }
    } catch {
      // Fallback
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}
