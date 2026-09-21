import {
  Component,
  output,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { LucideSettings } from '@lucide/angular';
import { UserProfileService } from '@core/services/user-profile.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-menu',
  standalone: true,
  imports: [LucideSettings],
  template: `
    <div class="flex items-center gap-3">
      <div class="avatar avatar-placeholder">
        <div
          class="w-10 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content shadow-lg ring-2 ring-base-300"
        >
          <span class="font-bold">{{ avatarInitial() }}</span>
        </div>
      </div>

      <!-- User Info -->
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-base-content">
          {{ displayName() }}
        </div>
        <div class="text-xs text-base-content/50">{{ planLabel() }}</div>
      </div>

      <!-- Menu Button -->
      <div class="tooltip tooltip-top" data-tip="Settings">
        <button
          (click)="openSettings.emit()"
          class="btn btn-circle btn-ghost text-base-content/60 btn-sm hover:text-base-content"
          aria-label="Settings"
        >
          <svg
            lucideSettings
            class="h-5 w-5 transition-transform duration-300 group-hover/btn:rotate-90"
          ></svg>
        </button>
      </div>
    </div>
  `,
})
export class UserMenuComponent {
  openSettings = output<void>();

  private readonly profile = inject(UserProfileService);

  constructor() {
    void this.profile.ensureLoaded();
  }

  /** Real display name when set (task 86), "Guest User" fallback otherwise. */
  readonly displayName = computed(() => {
    const name = this.profile.displayName().trim();
    return name || 'Guest User';
  });

  /** Live initial — never a hardcoded letter. */
  readonly avatarInitial = computed(() => {
    const name = this.displayName().trim();
    return (name.charAt(0) || 'G').toUpperCase();
  });

  readonly planLabel = computed(() => {
    const prof = this.profile.profession().trim();
    return prof || 'Free Plan';
  });
}
