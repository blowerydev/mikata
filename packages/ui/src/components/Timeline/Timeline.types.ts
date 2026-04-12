import type { MikataBaseProps, MikataColor, ClassNamesInput } from '../../types';

export type TimelineParts = 'root' | 'item' | 'itemBullet' | 'itemBody' | 'itemTitle' | 'itemContent';

export interface TimelineItem {
  title?: string | Node;
  bullet?: Node;
  children?: Node;
}

export interface TimelineProps extends MikataBaseProps {
  /** Items to show */
  items: TimelineItem[];
  /** Index of the most recently active item (all items up to and including this are styled active) */
  active?: number;
  /** Line alignment */
  align?: 'left' | 'right';
  /** Bullet size (px) */
  bulletSize?: number;
  /** Line width (px) */
  lineWidth?: number;
  /** Active color */
  color?: MikataColor;
  /** Reverse the fill direction */
  reverseActive?: boolean;
  classNames?: ClassNamesInput<TimelineParts>;
}
