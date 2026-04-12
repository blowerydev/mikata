import type { MikataSize } from '../../types';

export type InputWrapperParts = 'root' | 'label' | 'description' | 'error' | 'required';

export interface InputWrapperProps {
  id: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  size?: MikataSize;
  class?: string;
  classNames?: Partial<Record<InputWrapperParts, string>>;
  children: Node;
}
