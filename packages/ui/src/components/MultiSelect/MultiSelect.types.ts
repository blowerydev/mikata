import type { MikataBaseProps, MikataSize, ClassNamesInput } from '../../types';

export type MultiSelectParts =
  | 'root'
  | 'label'
  | 'required'
  | 'description'
  | 'error'
  | 'control'
  | 'input'
  | 'pill'
  | 'pillRemove'
  | 'dropdown'
  | 'option';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps extends MikataBaseProps {
  data: (string | MultiSelectOption)[];
  value?: string[];
  defaultValue?: string[];
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node;
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  /** Max number of selections */
  maxValues?: number;
  /** Whether to allow searching (filter dropdown by typing) */
  searchable?: boolean;
  /** Whether the picker can be cleared at once */
  clearable?: boolean;
  onChange?: (value: string[]) => void;
  classNames?: ClassNamesInput<MultiSelectParts>;
}
