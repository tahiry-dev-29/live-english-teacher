import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  viewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { LucideTrash2, LucideTriangleAlert } from '@lucide/angular';

/** Delete-confirmation dialog: opens when title is non-empty. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-session-delete-dialog',
  standalone: true,
  imports: [LucideTrash2, LucideTriangleAlert],
  template: `
    <dialog #dialog class="modal backdrop-blur-sm" (cancel)="cancelled.emit()">
      <div
        class="modal-box max-w-sm rounded-3xl border border-base-300 bg-base-200 p-6 shadow-2xl"
      >
        <div class="flex flex-col items-center gap-3 pb-4 text-center">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10 text-error"
          >
            <svg lucideTriangleAlert class="h-6 w-6" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-base-content">
              Delete conversation?
            </h3>
            <p
              class="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-base-content/60"
            >
              "<span class="font-medium text-base-content/80">{{
                title()
              }}</span
              >" will be permanently deleted. This action cannot be undone.
            </p>
          </div>
        </div>
        <div class="flex gap-2 pt-2">
          <button
            type="button"
            class="btn flex-1 rounded-xl btn-ghost text-xs btn-sm"
            (click)="cancelled.emit()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn flex-1 gap-1.5 rounded-xl text-xs btn-error btn-sm"
            (click)="confirmed.emit()"
          >
            <svg lucideTrash2 class="h-3.5 w-3.5" />Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit" (click)="cancelled.emit()">close</button>
      </form>
    </dialog>
  `,
})
export class SessionDeleteDialogComponent {
  readonly title = input<string>('');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    effect(() => {
      const hasPending = this.title() !== '';
      const el = this.dialog()?.nativeElement;
      if (!el) return;
      if (hasPending && !el.open) el.showModal();
      else if (!hasPending && el.open) el.close();
    });
  }
}
