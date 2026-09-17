import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideEllipsis } from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-menu',
  standalone: true,
  imports: [LucideEllipsis],
  template: `
    <div class="flex items-center gap-3">
      <!-- Avatar with gradient -->
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-bold text-primary-content shadow-lg ring-2 ring-base-300 transition-all"
      >
        G
      </div>

      <!-- User Info -->
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-base-content">
          Guest User
        </div>
        <div class="text-xs text-base-content/50">Free Plan</div>
      </div>

      <!-- Menu Button -->
      <button
        (click)="openSettings.emit()"
        class="group/btn btn btn-circle btn-ghost text-base-content/60 btn-sm hover:text-base-content"
        title="Settings"
        aria-label="Settings"
      >
        <svg
          lucideEllipsis
          class="h-5 w-5 transition-transform duration-300 group-hover/btn:rotate-90"
        ></svg>
      </button>
    </div>
  `,
})
export class UserMenuComponent {
  openSettings = output<void>();
}
