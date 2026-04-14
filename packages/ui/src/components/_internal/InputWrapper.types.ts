import type { MikataSize } from '../../types';

export type InputWrapperParts = 'root' | 'label' | 'description' | 'error' | 'required';

export interface InputWrapperProps {
  id: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node | null | false | (() => string | Node | null | undefined);
  required?: boolean;
  size?: MikataSize;
  class?: string;
  classNames?: Partial<Record<InputWrapperParts, string>>;
  children: Node;
}
