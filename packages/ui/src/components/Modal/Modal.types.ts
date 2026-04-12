import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type ModalParts = 'root' | 'overlay' | 'content' | 'header' | 'title' | 'body' | 'close';
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps extends MikataBaseProps {
  /** Dialog title shown in the header */
  title?: string | Node;
  /** Width preset for the modal content */
  size?: ModalSize;
  /** Vertically center the modal */
  centered?: boolean;
  /** Close when clicking the overlay backdrop */
  closeOnClickOutside?: boolean;
  /** Close when pressing Escape */
  closeOnEscape?: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Show the close button in the header */
  withCloseButton?: boolean;
  /** Class names for individual parts */
  classNames?: Partial<Record<ModalParts, string>>;
  /** Modal body content */
  children: Node;
}
