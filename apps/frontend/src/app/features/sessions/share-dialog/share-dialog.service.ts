import { Injectable, signal } from '@angular/core';

/** Share-dialog ephemeral state: snapshot URL + generation flag + dialog element. */
@Injectable()
export class ShareDialogService {
  private dialogEl: HTMLDialogElement | null = null;
  readonly snapshotUrl = signal<string>('');
  readonly isGenerating = signal<boolean>(false);
  registerDialog(el: HTMLDialogElement): void {
    this.dialogEl = el;
  }
  setSnapshotUrl(url: string): void {
    this.snapshotUrl.set(url);
  }
  setGenerating(value: boolean): void {
    this.isGenerating.set(value);
  }
  syncOpen(open: boolean): void {
    const el = this.dialogEl;
    if (!el) return;
    if (open && !el.open) {
      this.snapshotUrl.set('');
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }
  reset(): void {
    this.snapshotUrl.set('');
    this.isGenerating.set(false);
  }
}
