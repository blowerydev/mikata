import type { MikataBaseProps } from '../../types';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps extends MikataBaseProps {
  /** Tooltip text content */
  label: string;
  /** Placement relative to trigger element */
  position?: TooltipPosition;
  /** Delay before showing tooltip in ms */
  delay?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
  /** The trigger element */
  children: Node;
}
