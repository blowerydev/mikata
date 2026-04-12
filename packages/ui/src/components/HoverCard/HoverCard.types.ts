import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type HoverCardParts = 'root' | 'dropdown' | 'arrow';

export interface HoverCardProps extends MikataBaseProps {
  /** Dropdown placement relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before show (ms) */
  openDelay?: number;
  /** Delay before close (ms) */
  closeDelay?: number;
  /** Show arrow pointing at trigger */
  withArrow?: boolean;
  /** Trigger element */
  target: Node;
  /** Dropdown content */
  children: Node;
  classNames?: ClassNamesInput<HoverCardParts>;
}
