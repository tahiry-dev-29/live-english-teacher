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
        class="w-10 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content shadow-lg ring-2 ring-base-300 transition-all"
      >
        G
      </div>

      <!-- User Info -->
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-base-content truncate">
          Guest User
        </div>
        <div class="text-xs text-base-content/50">Free Plan</div>
      </div>

      <!-- Menu Button -->
      <button
        (click)="openSettings.emit()"
        class="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content group/btn"
        title="Settings"
        aria-label="Settings"
      >
        <svg
          lucideEllipsis
          class="w-5 h-5 group-hover/btn:rotate-90 transition-transform duration-300"
        ></svg>
      </button>
    </div>
  `,
})
export class UserMenuComponent {
  openSettings = output<void>();
}
