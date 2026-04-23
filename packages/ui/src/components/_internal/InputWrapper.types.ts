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
  /**
   * The input(s) that live inside the wrapper. Accepts either a Node
   * directly or a factory function that builds the node.
   *
   * Factories run *inside* InputWrapper's setup callback, which means
   * any `adoptElement` calls the factory makes participate in the
   * wrapper's adoption cursor - label/description slots push through
   * first, then the factory's children adopt from the right position.
   * Pre-built nodes skip that ordering and rely on a late appendChild.
   */
  children: Node | (() => Node);
}
