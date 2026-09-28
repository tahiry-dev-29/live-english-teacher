import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { LucideDownload, LucideSettings } from '@lucide/angular';
import { UserMenuComponent } from '../user-menu/user-menu.component';

/** Sidebar bottom zone: PWA install CTA + user menu (or collapsed settings). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar-footer',
  standalone: true,
  imports: [UserMenuComponent, LucideDownload, LucideSettings],
  template: `
    <div
      class="border-t border-base-300/70 p-2.5"
      [class.flex]="collapsed()"
      [class.flex-col]="collapsed()"
      [class.items-center]="collapsed()"
    >
      @if (canInstall()) {
        <button
          (click)="install.emit()"
          class="btn mb-2 w-full gap-2 btn-outline btn-secondary btn-sm"
          title="Install app"
        >
          <svg lucideDownload class="h-4 w-4"></svg>
          @if (!collapsed()) {
            <span>Install App</span>
          }
        </button>
      }
      @if (!collapsed()) {
        <app-user-menu (openSettings)="openSettings.emit()" />
      } @else {
        <div class="tooltip tooltip-right" data-tip="Settings">
          <button
            (click)="openSettings.emit()"
            class="btn btn-circle h-9 min-h-0 w-9 btn-ghost text-base-content/60 transition-colors duration-150 btn-sm hover:bg-base-300 hover:text-base-content"
            title="Settings"
            aria-label="Settings"
          >
            <svg lucideSettings class="h-4 w-4"></svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class SidebarFooterComponent {
  readonly collapsed = input<boolean>(false);
  readonly canInstall = input<boolean>(false);
  readonly install = output<void>();
  readonly openSettings = output<void>();
  protected readonly installLabel = computed(() =>
    this.collapsed() ? '' : 'Install App',
  );
}
