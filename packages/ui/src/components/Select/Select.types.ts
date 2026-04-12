import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { InputWrapperParts } from '../_internal/InputWrapper.types';

export type SelectParts = InputWrapperParts | 'input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * One-shot loader for a native `<select>`. Called once on mount; the signal
 * aborts if the component unmounts before the fetch resolves.
 */
export type SelectFetcher = (signal: AbortSignal) => Promise<SelectOption[]>;

export interface SelectProps extends MikataBaseProps {
  /**
   * Static options, or an async loader. While the loader is in flight the
   * `<select>` is disabled and a placeholder ("Loading…") is shown.
   */
  data: SelectOption[] | SelectFetcher;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node | (() => string | Node | null | undefined);
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  /** Text shown in the placeholder slot while an async load is in flight. */
  loadingLabel?: string;
  onChange?: (e: Event) => void;
  classNames?: ClassNamesInput<SelectParts>;
}
