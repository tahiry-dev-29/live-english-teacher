import { Component, output } from '@angular/core';

@Component({
  selector: 'app-user-menu',
  standalone: true,
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
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="w-5 h-5 group-hover/btn:rotate-90 transition-transform duration-300"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
      </button>
    </div>
  `,
})
export class UserMenuComponent {
  openSettings = output<void>();
}
