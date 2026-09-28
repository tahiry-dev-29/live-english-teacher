import {
  Component,
  ChangeDetectionStrategy,
  input,
  booleanAttribute,
  signal,
  computed,
  model,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';
import { LucideChevronDown, LucideCheck } from '@lucide/angular';
import type {
  SelectOption,
  SelectSize,
  SelectColor,
} from './select-option.model';
export type { SelectOption, SelectSize, SelectColor };
import { selectedOptionLabel, selectSizeClasses } from './select-keyboard.util';

/**
 * Reusable custom DaisyUI select (options model + keyboard utils split out).
 * Two-way binding via model(): [(value)]="mySignal()".
 */
@Component({
  selector: 'app-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideChevronDown, LucideCheck],
  templateUrl: './select.component.html',
})
export class AppSelectComponent<T = string> {
  private readonly elementRef = inject(ElementRef);
  readonly options = input.required<SelectOption<T>[]>();
  readonly value = model<T | null>(null);
  readonly selectId = input<string>(`app-select-${_idCounter++}`);
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly color = input<SelectColor>('primary');
  readonly size = input<SelectSize>('sm');
  readonly ghost = input(false, { transform: booleanAttribute });
  readonly fullWidth = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly isOpen = signal<boolean>(false);
  readonly selectedLabel = computed<string>(() =>
    selectedOptionLabel(this.options(), this.value()),
  );
  protected readonly sizeClass = computed<string>(() =>
    selectSizeClasses(this.size()),
  );
  toggleDropdown(event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    this.isOpen.update((v) => !v);
  }
  selectOption(opt: SelectOption<T>, event: Event): void {
    event.stopPropagation();
    if (opt.disabled) return;
    this.value.set(opt.value);
    this.isOpen.set(false);
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) this.isOpen.set(false);
  }
  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.isOpen.set(false);
  }
}
let _idCounter = 0;
