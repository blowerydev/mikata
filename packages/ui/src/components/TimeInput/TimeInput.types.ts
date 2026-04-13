import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type TimeInputParts = 'root' | 'input';

export interface TimeInputProps extends MikataBaseProps {
  /** Controlled value, `HH:MM` or `HH:MM:SS`. */
  value?: string;
  defaultValue?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node | (() => string | Node | null | undefined);
  required?: boolean;
  disabled?: boolean;
  /** Include a seconds field. */
  withSeconds?: boolean;
  /** Step increment in seconds. Passed to the native input. */
  step?: number;
  /** Min value (`HH:MM[:SS]`). */
  min?: string;
  /** Max value (`HH:MM[:SS]`). */
  max?: string;
  size?: MikataSize;
  onChange?: (value: string) => void;
  classNames?: ClassNamesInput<TimeInputParts>;
}
