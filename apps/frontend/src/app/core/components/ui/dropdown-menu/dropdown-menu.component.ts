import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  viewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { LucideEllipsis } from '@lucide/angular';

@Component({
  selector: 'app-dropdown-menu',
  standalone: true,
  imports: [LucideEllipsis],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="dropdown"
      [class.dropdown-end]="true"
      [class.dropdown-open]="open()"
      [class.dropdown-top]="isMenuUp()"
      [class.dropdown-bottom]="!isMenuUp()"
    >
      <button
        #triggerBtn
        type="button"
        (click)="toggle($event)"
        (keydown.escape)="close()"
        class="btn btn-circle btn-ghost text-base-content/60 btn-xs hover:text-base-content"
        [attr.aria-label]="triggerLabel()"
        [attr.aria-expanded]="open()"
        aria-haspopup="menu"
      >
        <svg lucideEllipsis class="h-3.5 w-3.5"></svg>
      </button>
      @if (open()) {
        <ul
          role="menu"
          tabindex="0"
          (click)="close()"
          (keydown.escape)="close()"
          class="menu dropdown-content z-50 w-52 rounded-2xl border border-base-300 bg-base-200/95 p-1.5 shadow-2xl backdrop-blur-md outline-none"
        >
          <ng-content />
        </ul>
      }
    </div>
  `,
})
export class AppDropdownMenuComponent {
  readonly triggerLabel = input<string>('Options');
  readonly menuPosition = input<'top-end' | 'bottom-end'>('top-end');
  readonly opened = output<void>();
  readonly closed = output<void>();

  readonly open = signal<boolean>(false);
  readonly isMenuUp = signal<boolean>(true);
  readonly triggerBtn = viewChild<ElementRef<HTMLElement>>('triggerBtn');

  constructor() {
    this.isMenuUp.set(this.menuPosition() === 'top-end');
    effect((onCleanup) => {
      if (!this.open()) return;
      const onPointerDown = (event: PointerEvent): void => {
        const el = this.triggerBtn()?.nativeElement.parentElement;
        if (el && !el.contains(event.target as Node)) this.setOpen(false);
      };
      const onEscape = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') this.setOpen(false);
      };
      document.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('keydown', onEscape);
      onCleanup(() => {
        document.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('keydown', onEscape);
      });
    });
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.detectPosition();
    this.setOpen(!this.open());
  }

  close(): void {
    this.setOpen(false);
  }

  private setOpen(value: boolean): void {
    if (value === this.open()) return;
    this.open.set(value);
    if (value) this.opened.emit();
    else this.closed.emit();
  }

  private detectPosition(): void {
    const el = this.triggerBtn()?.nativeElement;
    if (!el) {
      this.isMenuUp.set(this.menuPosition() === 'top-end');
      return;
    }
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
      this.isMenuUp.set(true);
    } else if (spaceBelow >= 200 && spaceAbove < spaceBelow) {
      this.isMenuUp.set(false);
    } else {
      this.isMenuUp.set(this.menuPosition() === 'top-end');
    }
  }
}
