import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideEllipsis } from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-menu',
  standalone: true,
  imports: [LucideEllipsis],
  template: `
    <div class="flex items-center gap-3">
      <div class="avatar avatar-placeholder">
        <div
          class="w-10 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content shadow-lg ring-2 ring-base-300"
        >
          <span class="font-bold">G</span>
        </div>
      </div>

      <!-- User Info -->
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-base-content">
          Guest User
        </div>
        <div class="text-xs text-base-content/50">Free Plan</div>
      </div>

      <!-- Menu Button -->
      <div class="tooltip tooltip-top" data-tip="Settings">
        <button
          (click)="openSettings.emit()"
          class="btn btn-circle btn-ghost text-base-content/60 btn-sm hover:text-base-content"
          aria-label="Settings"
        >
          <svg
            lucideEllipsis
            class="h-5 w-5 transition-transform duration-300 group-hover/btn:rotate-90"
          ></svg>
        </button>
      </div>
    </div>
  `,
})
export class UserMenuComponent {
  openSettings = output<void>();
}
