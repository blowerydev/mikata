import type { MikataBaseProps, MikataSize, ClassNamesInput } from '../../types';

export type TagsInputParts =
  | 'root'
  | 'label'
  | 'required'
  | 'description'
  | 'error'
  | 'control'
  | 'input'
  | 'pill'
  | 'pillRemove';

export interface TagsInputProps extends MikataBaseProps {
  value?: string[];
  defaultValue?: string[];
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node;
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  /** Characters that commit a tag. Default: ['Enter', ','] */
  splitChars?: string[];
  /** Max number of tags */
  maxTags?: number;
  /** If true, allow duplicate tags */
  allowDuplicates?: boolean;
  /** Suggestions shown in dropdown (optional) */
  data?: string[];
  onChange?: (value: string[]) => void;
  classNames?: ClassNamesInput<TagsInputParts>;
}
