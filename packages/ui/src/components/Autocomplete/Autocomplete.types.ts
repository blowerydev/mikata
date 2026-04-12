import type { MikataBaseProps, MikataSize, ClassNamesInput } from '../../types';

export type AutocompleteParts =
  | 'root'
  | 'label'
  | 'required'
  | 'description'
  | 'error'
  | 'input'
  | 'dropdown'
  | 'option';

export interface AutocompleteProps extends MikataBaseProps {
  /** List of suggestions */
  data: string[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node;
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  /** Max number of suggestions to show */
  limit?: number;
  /** Fired on every input change */
  onChange?: (value: string) => void;
  /** Fired when user picks a suggestion */
  onOptionSubmit?: (value: string) => void;
  classNames?: ClassNamesInput<AutocompleteParts>;
}
