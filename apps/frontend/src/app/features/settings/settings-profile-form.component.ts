import {
  Component,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
} from '@angular/core';
import { LucideUser } from '@lucide/angular';
import {
  UserProfileService,
  UserProfile,
} from '@core/services/user-profile.service';

/** "Your profile" section of the general settings tab (task 86). */
@Component({
  selector: 'app-settings-profile-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideUser],
  template: `
    <div class="space-y-2">
      <p
        class="flex items-center gap-1.5 text-xs font-medium tracking-wider text-base-content/50 uppercase"
      >
        <svg lucideUser class="h-3.5 w-3.5"></svg>
        <span>Your profile</span>
      </p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label class="flex flex-col gap-1">
          <span class="text-[11px] text-base-content/50">Name</span>
          <input
            type="text"
            class="input-bordered input w-full text-xs input-sm"
            placeholder="Your name"
            [value]="profile.displayName()"
            (input)="onProfileInput('displayName', $any($event.target).value)"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-[11px] text-base-content/50">Profession</span>
          <input
            type="text"
            class="input-bordered input w-full text-xs input-sm"
            placeholder="e.g. Nurse, Student"
            [value]="profile.profession()"
            (input)="onProfileInput('profession', $any($event.target).value)"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-[11px] text-base-content/50">Specialization</span>
          <input
            type="text"
            class="input-bordered input w-full text-xs input-sm"
            placeholder="e.g. Medical English"
            [value]="profile.specialization()"
            (input)="
              onProfileInput('specialization', $any($event.target).value)
            "
          />
        </label>
      </div>
    </div>
  `,
})
export class SettingsProfileFormComponent {
  readonly profile = inject(UserProfileService);
  private readonly destroyRef = inject(DestroyRef);

  private profileTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.profile.ensureLoaded();
    this.destroyRef.onDestroy(() => {
      if (this.profileTimer) clearTimeout(this.profileTimer);
    });
  }

  /** Keystroke → instant local state, single debounced server save. */
  onProfileInput(field: keyof UserProfile, value: string): void {
    this.profile.stageProfile({ [field]: value } as Partial<UserProfile>);
    if (this.profileTimer) clearTimeout(this.profileTimer);
    this.profileTimer = setTimeout(() => {
      void this.profile.saveProfile();
    }, 500);
  }
}
