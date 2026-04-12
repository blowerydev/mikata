import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type PinInputParts = 'root' | 'input';

export interface PinInputProps extends MikataBaseProps {
  /** Number of digits */
  length?: number;
  /** Controlled value */
  value?: string;
  /** Uncontrolled initial value */
  defaultValue?: string;
  /** Placeholder per cell */
  placeholder?: string;
  /** Visual size */
  size?: MikataSize;
  /** Restrict input to digits (default) or allow alpha */
  type?: 'number' | 'alphanumeric';
  /** Obscure entered characters (for OTP) */
  mask?: boolean;
  /** Disable input */
  disabled?: boolean;
  /** Show inputs as invalid */
  error?: boolean;
  /** Fires on every change */
  onChange?: (value: string) => void;
  /** Fires when all cells are filled */
  onComplete?: (value: string) => void;
  /** autofocus the first cell */
  autoFocus?: boolean;
  classNames?: ClassNamesInput<PinInputParts>;
}
