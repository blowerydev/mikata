import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type PopoverPosition = 'top' | 'bottom' | 'left' | 'right';
export type PopoverParts = 'root' | 'dropdown' | 'arrow';

export interface PopoverProps extends MikataBaseProps {
  /** Placement of the dropdown relative to the trigger */
  position?: PopoverPosition;
  /** Controlled open state */
  opened?: boolean;
  /** Called when the popover should close */
  onClose?: () => void;
  /** Show an arrow pointing to the trigger */
  withArrow?: boolean;
  /** Close when clicking outside the popover */
  closeOnClickOutside?: boolean;
  /** Close when pressing Escape */
  closeOnEscape?: boolean;
  /** Class names for individual parts */
  classNames?: Partial<Record<PopoverParts, string>>;
  /** The trigger element */
  target: Node;
  /** Dropdown content */
  children: Node;
}
