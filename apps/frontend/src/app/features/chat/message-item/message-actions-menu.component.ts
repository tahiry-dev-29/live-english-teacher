import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  LucideCopy,
  LucideGitFork,
  LucideInfo,
  LucideSquare,
  LucideVolume2,
} from '@lucide/angular';
import { AppDropdownMenuComponent } from '@core/components/ui/dropdown-menu/dropdown-menu.component';

/** ⋯ canonical dropdown of the AI action bar (task 89). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-actions-menu',
  standalone: true,
  imports: [
    AppDropdownMenuComponent,
    LucideGitFork,
    LucideVolume2,
    LucideSquare,
    LucideCopy,
    LucideInfo,
  ],
  template: `
    <app-dropdown-menu triggerLabel="More options">
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
            <svg lucideVolume2 class="h-4 w-4 text-base-content/70"></svg>
            <span>Listen</span>
          }
        </button>
      </li>
      <li>
        <button
          type="button"
          (click)="copyRequested.emit()"
          class="flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-base-content hover:bg-base-300"
        >
          <svg lucideCopy class="h-4 w-4 text-base-content/70"></svg>
          <span>{{ copied() ? 'Copied!' : 'Copy as Markdown' }}</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          (click)="detailsToggled.emit()"
          class="flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-base-content hover:bg-base-300"
        >
          <svg lucideInfo class="h-4 w-4 text-base-content/70"></svg>
          <span>See response details</span>
        </button>
      </li>
    </app-dropdown-menu>
  `,
})
export class MessageActionsMenuComponent {
  readonly isPlaying = input<boolean>(false);
  readonly copied = input<boolean>(false);

  readonly fork = output<void>();
  readonly playRequested = output<void>();
  readonly stop = output<void>();
  readonly copyRequested = output<void>();
  readonly detailsToggled = output<void>();

  protected handlePlayStop(): void {
    if (this.isPlaying()) {
      this.stop.emit();
    } else {
      this.playRequested.emit();
    }
  }
}
