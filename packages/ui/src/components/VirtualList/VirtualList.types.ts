import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type VirtualListParts = 'root' | 'inner' | 'item';

export interface VirtualListProps<T> extends MikataBaseProps {
  /** Data items to render. */
  data: T[];
  /** Fixed item size in pixels, or a function (index) => size. */
  itemSize: number | ((index: number) => number);
  /** Render function for each visible item. */
  renderItem: (item: T, index: number) => Node;
  /** Number of extra items rendered above/below the visible range. */
  overscan?: number;
  /** Explicit pixel height/width for the scroll container. */
  size?: number;
  /** Scroll direction. */
  orientation?: 'vertical' | 'horizontal';
  classNames?: ClassNamesInput<VirtualListParts>;
}

export interface VirtualizerOptions {
  /** Total item count. */
  count: number;
  /** Fixed size in pixels, or `(index) => size`. */
  itemSize: number | ((index: number) => number);
  /** Number of items to render outside the visible range. Default 3. */
  overscan?: number;
  /** Scroll container element. */
  scrollElement: HTMLElement;
  /** Direction. Defaults to 'vertical'. */
  orientation?: 'vertical' | 'horizontal';
}

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
}
