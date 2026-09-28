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
import { NotificationService } from '@features/user-data/services/notification.service';
import { ChatService } from '@features/chat/services/chat.service';
import {
  LucideX,
  LucideCopy,
  LucideCheck,
  LucideShare2,
  LucideGlobe,
  LucideLink,
  LucideLoader,
} from '@lucide/angular';
import { ShareDialogService } from './share-dialog.service';
import { buildShareUrl, copyTextToClipboard } from './share-link.util';

/** Share-link dialog shell: dialog sync + orchestration, state in service. */
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
  providers: [ShareDialogService],
  templateUrl: './share-dialog.component.html',
})
export class ShareDialogComponent {
  private readonly notifications = inject(NotificationService);
  private readonly chatService = inject(ChatService);
  protected readonly store = inject(ShareDialogService);

  readonly session = input<Session | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly closed = output<void>();

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly isCopied = signal<boolean>(false);

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const el = this.dialog()?.nativeElement;
      if (!el) return;
      if (open && !el.open) {
        this.isCopied.set(false);
        this.store.reset();
        el.showModal();
        void this.generateShareLink();
      } else if (!open && el.open) {
        el.close();
      }
    });
  }

  private async generateShareLink(): Promise<void> {
    const current = this.session();
    if (!current) return;
    this.store.setGenerating(true);
    try {
      const forked = await this.chatService.forkSession(current.id);
      if (forked) {
        const base =
          typeof window !== 'undefined' ? window.location.origin : '';
        this.store.setSnapshotUrl(buildShareUrl(base, forked.id));
      } else {
        this.notifications.error(
          'Failed to create share link. Please try again.',
        );
      }
    } finally {
      this.store.setGenerating(false);
    }
  }

  async copyLink(): Promise<void> {
    const ok = await copyTextToClipboard(this.store.snapshotUrl());
    if (!ok) return;
    this.isCopied.set(true);
    this.notifications.success('Link copied to clipboard!');
    setTimeout(() => this.isCopied.set(false), 2500);
  }

  onClose(): void {
    this.closed.emit();
  }
}
