import type { MikataBaseProps } from '../../types';

export interface CollapseProps extends MikataBaseProps {
  /** Whether the panel is open. May be a reactive getter for reactive updates. */
  in?: boolean | (() => boolean);
  /** Animation duration in ms (default 200) */
  duration?: number;
  /** Timing function */
  timing?: string;
  /** Called when open animation completes */
  onTransitionEnd?: () => void;
  children: Node;
}
