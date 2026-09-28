import type { SelectOption } from './select-option.model';

/** Finds the label for the current value ('' when nothing matches). */
export function selectedOptionLabel<T>(
  options: SelectOption<T>[],
  value: T | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '';
  const match = options.find((o) => o.value === value);
  return match ? match.label : String(value);
}

/** Tailwind padding/typography classes for each DaisyUI select size. */
export function selectSizeClasses(size: string): string {
  switch (size) {
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

/** Index of the next enabled option moving ±1 with wrap-around (-1 = none). */
export function moveOptionIndex<T>(
  options: SelectOption<T>[],
  fromIndex: number,
  delta: 1 | -1,
): number {
  if (options.length === 0) return -1;
  let index = fromIndex;
  for (let step = 0; step < options.length; step++) {
    index = (index + delta + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}
