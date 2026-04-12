import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type ScrollAreaParts = 'root' | 'viewport' | 'scrollbar' | 'thumb';

export interface ScrollAreaProps extends MikataBaseProps {
  /** Scrollbar type (always visible, on scroll, on hover) */
  type?: 'always' | 'auto' | 'hover' | 'scroll';
  /** Scrollbar offset in pixels */
  scrollbarSize?: number;
  /** Which direction to scroll */
  direction?: 'vertical' | 'horizontal' | 'both';
  /** Height of the viewport (CSS value) */
  height?: string | number;
  /** Width of the viewport */
  width?: string | number;
  /** Offset to scrollbars (px) */
  offsetScrollbars?: boolean;
  classNames?: ClassNamesInput<ScrollAreaParts>;
  children: Node | Node[];
  onScrollPositionChange?: (pos: { x: number; y: number }) => void;
}
