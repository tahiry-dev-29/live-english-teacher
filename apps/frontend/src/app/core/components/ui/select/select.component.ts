import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  booleanAttribute,
  forwardRef,
  signal,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { LucideChevronDown, LucideCheck } from '@lucide/angular';

/** A single option entry for the select dropdown. */
export interface SelectOption<T = string> {
  /** The value bound to the option. */
  value: T;
  /** Human-readable label shown in the dropdown. */
  label: string;
  /** When true the option is rendered but not selectable. */
  disabled?: boolean;
}

/** DaisyUI size modifier for the select element. */
export type SelectSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** DaisyUI color modifier for the select element. */
export type SelectColor =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

/**
 * Reusable Custom DaisyUI Select component.
 *
 * Implements a modern custom dropdown with complete DaisyUI theme
 * compatibility (forest, app-dark, app-light) that avoids native OS select popup artifacts.
 *
 * Implements ControlValueAccessor for full [(ngModel)] and reactive form compatibility.
 */
@Component({
  selector: 'app-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideChevronDown, LucideCheck],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative flex w-full flex-col gap-1">
      <!-- Optional label -->
      @if (label()) {
        <label
          [for]="selectId()"
          class="text-xs font-medium tracking-wider text-base-content/50 uppercase"
        >
          {{ label() }}
        </label>
      }

      <!-- Custom Trigger Button (Matches DaisyUI look & feel) -->
      <button
        type="button"
        [id]="selectId()"
        [disabled]="disabled() || formDisabled()"
        [attr.aria-label]="ariaLabel() || label() || null"
        [attr.aria-expanded]="isOpen()"
        (click)="toggleDropdown($event)"
        class="flex items-center justify-between gap-2 rounded-lg border bg-base-100 text-left text-sm transition-all"
        [class.w-full]="fullWidth()"
        [class.border-primary]="isOpen() || color() === 'primary'"
        [class.border-base-300]="!isOpen() && color() !== 'primary'"
        [class.ring-1]="isOpen()"
        [class.ring-primary/40]="isOpen()"
        [class.opacity-50]="disabled() || formDisabled()"
        [class.cursor-not-allowed]="disabled() || formDisabled()"
        [ngClass]="sizeClasses()"
      >
        <span class="truncate font-normal" [class.text-base-content/40]="!selectedLabel()">
          {{ selectedLabel() || placeholder() || '— Choose —' }}
        </span>
        <svg
          lucideChevronDown
          class="h-4 w-4 shrink-0 text-base-content/60 transition-transform duration-200"
          [class.rotate-180]="isOpen()"
        ></svg>
      </button>

      <!-- Custom Dropdown Menu with DaisyUI styling & themes (no native white borders) -->
      @if (isOpen()) {
        <div
          class="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-base-300 bg-base-200/95 p-1 shadow-2xl backdrop-blur-md"
        >
          <ul class="menu menu-sm w-full p-0" role="listbox">
            @for (opt of options(); track opt.value) {
              <li role="option" [attr.aria-selected]="opt.value === currentValue()">
                <button
                  type="button"
                  [disabled]="opt.disabled ?? false"
                  (click)="selectOption(opt, $event)"
                  class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors"
                  [class.bg-primary]="opt.value === currentValue()"
                  [class.text-primary-content]="opt.value === currentValue()"
                  [class.font-semibold]="opt.value === currentValue()"
                  [class.text-base-content]="opt.value !== currentValue()"
                  [class.hover:bg-base-300]="opt.value !== currentValue()"
                >
                  <span class="truncate">{{ opt.label }}</span>
                  @if (opt.value === currentValue()) {
                    <svg lucideCheck class="h-3.5 w-3.5 shrink-0"></svg>
                  }
                </button>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class AppSelectComponent<T = string> implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef);

  // ── Inputs ──────────────────────────────────────────────────────────────

  /** List of options to render inside the select. */
  readonly options = input.required<SelectOption<T>[]>();

  /** Controlled value when not using ngModel. */
  readonly value = input<T | null>(null);

  /** Accessible id forwarded to label and trigger button. */
  readonly selectId = input<string>(`app-select-${_idCounter++}`);

  /** Visible label rendered above the select. */
  readonly label = input<string>('');

  /** Placeholder option shown when no value is selected. */
  readonly placeholder = input<string>('');

  /** aria-label for accessibility. */
  readonly ariaLabel = input<string>('');

  /** DaisyUI color modifier (e.g. "primary", "secondary"). */
  readonly color = input<SelectColor>('primary');

  /** DaisyUI size modifier (e.g. "sm", "md"). */
  readonly size = input<SelectSize>('sm');

  /** When true, renders the ghost style variant. */
  readonly ghost = input(false, { transform: booleanAttribute });

  /** Makes the select fill 100% of its container. */
  readonly fullWidth = input(true, { transform: booleanAttribute });

  /** Disables the select element. */
  readonly disabled = input(false, { transform: booleanAttribute });

  // ── Outputs ─────────────────────────────────────────────────────────────

  /** Emits the selected value whenever the user picks a new option. */
  readonly valueChange = output<T>();

  // ── Internal state ───────────────────────────────────────────────────────

  readonly currentValue = signal<T | null>(null);
  readonly isOpen = signal<boolean>(false);
  protected readonly formDisabled = signal(false);

  readonly selectedLabel = computed<string>(() => {
    const current = this.currentValue();
    if (current === null || current === undefined || current === '') return '';
    const match = this.options().find((o) => o.value === current);
    return match ? match.label : String(current);
  });

  constructor() {
    effect(() => {
      const val = this.value();
      if (val !== undefined && val !== null) {
        this.currentValue.set(val);
      }
    });
  }

  // ── ControlValueAccessor callbacks ───────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (v: T) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouched: () => void = () => {};

  writeValue(val: T): void {
    this.currentValue.set(val ?? null);
  }

  registerOnChange(fn: (v: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  // ── Helpers & Listeners ──────────────────────────────────────────────────

  sizeClasses(): string {
    switch (this.size()) {
      case 'xs':
        return 'px-2.5 py-1 text-xs min-h-[1.75rem]';
      case 'sm':
        return 'px-3 py-1.5 text-xs min-h-[2rem]';
      case 'lg':
        return 'px-4 py-3 text-base min-h-[3rem]';
      case 'xl':
        return 'px-5 py-3.5 text-lg min-h-[3.5rem]';
      case 'md':
      default:
        return 'px-3.5 py-2 text-sm min-h-[2.5rem]';
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    if (this.disabled() || this.formDisabled()) return;
    this.isOpen.update((v) => !v);
    if (!this.isOpen()) {
      this.onTouched();
    }
  }

  selectOption(opt: SelectOption<T>, event: Event): void {
    event.stopPropagation();
    if (opt.disabled) return;
    this.currentValue.set(opt.value);
    this.onChange(opt.value);
    this.valueChange.emit(opt.value);
    this.isOpen.set(false);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.isOpen.set(false);
      this.onTouched();
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.onTouched();
    }
  }
}

/** Auto-incrementing counter to generate unique IDs when none is provided. */
let _idCounter = 0;

