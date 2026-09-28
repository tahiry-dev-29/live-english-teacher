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
