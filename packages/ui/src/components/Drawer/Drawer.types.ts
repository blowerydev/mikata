import type { MikataBaseProps, ClassNamesInput } from '../../types';

/**
 * Drawer anchor edge.
 * - `'left' | 'right'` - **physical**: always visual left/right regardless of writing direction.
 * - `'start' | 'end'` - **logical**: flips with the ThemeProvider direction (`ltr` anchors `start` to the left, `rtl` anchors `start` to the right).
 * - `'top' | 'bottom'` - physical vertical edges; unaffected by direction.
 *
 * New code should prefer `'start' | 'end'`.
 */
export type DrawerPosition = 'left' | 'right' | 'start' | 'end' | 'top' | 'bottom';
export type DrawerParts = 'root' | 'overlay' | 'content' | 'header' | 'title' | 'body' | 'close';

export interface DrawerProps extends MikataBaseProps {
  /** Drawer title shown in the header */
  title?: string | Node;
  /** Edge of the screen the drawer slides in from */
  position?: DrawerPosition;
  /** CSS width (left/right) or height (top/bottom) */
  size?: string;
  /** Close when clicking the overlay backdrop */
  closeOnClickOutside?: boolean;
  /** Close when pressing Escape */
  closeOnEscape?: boolean;
  /** Called when the drawer should close */
  onClose: () => void;
  /** Show the close button in the header */
  withCloseButton?: boolean;
  /** Class names for individual parts */
  classNames?: Partial<Record<DrawerParts, string>>;
  /** Drawer body content */
  children: Node;
}
