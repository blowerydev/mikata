import { signal, effect, type ReadSignal } from '@mikata/reactivity';
import { onCleanup } from '@mikata/runtime';
import type { VirtualizerOptions, VirtualItem } from './VirtualList.types';

export interface Virtualizer {
  /** Visible items (with index, start offset, size). */
  virtualItems: ReadSignal<VirtualItem[]>;
  /** Total scroll size in pixels. */
  totalSize: ReadSignal<number>;
  /** Scroll to a specific index. */
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  /** Force a re-measure (e.g. after data changes or container resize). */
  measure: () => void;
}

/**
 * Compute offsets for each item and expose a reactive visible range based on
 * the scroll container's scroll position and client size.
 *
 * Fixed-size items use an O(1) math path; variable-size items use a single
 * cumulative offset array rebuilt on data changes.
 */
export function createVirtualizer(options: VirtualizerOptions): Virtualizer {
  const { count, itemSize, overscan = 3, scrollElement, orientation = 'vertical' } = options;
  const horizontal = orientation === 'horizontal';

  const [scrollOffset, setScrollOffset] = signal(0);
  const [viewport, setViewport] = signal(
    horizontal ? scrollElement.clientWidth : scrollElement.clientHeight,
  );
  const [itemCount, setItemCount] = signal(count);

  // Offsets[i] = start offset of item i. Offsets[count] = total size.
  const [offsets, setOffsets] = signal<number[]>(buildOffsets(count, itemSize));

  function buildOffsets(n: number, sz: number | ((i: number) => number)): number[] {
    const out: number[] = new Array(n + 1);
    out[0] = 0;
    if (typeof sz === 'number') {
      for (let i = 1; i <= n; i++) out[i] = i * sz;
    } else {
      for (let i = 0; i < n; i++) out[i + 1] = out[i] + sz(i);
    }
    return out;
  }

  function measure() {
    setItemCount(count);
    setOffsets(buildOffsets(count, itemSize));
    setViewport(horizontal ? scrollElement.clientWidth : scrollElement.clientHeight);
    setScrollOffset(horizontal ? scrollElement.scrollLeft : scrollElement.scrollTop);
  }

  const onScroll = () => {
    setScrollOffset(horizontal ? scrollElement.scrollLeft : scrollElement.scrollTop);
  };
  scrollElement.addEventListener('scroll', onScroll, { passive: true });
  onCleanup(() => scrollElement.removeEventListener('scroll', onScroll));

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => {
        setViewport(horizontal ? scrollElement.clientWidth : scrollElement.clientHeight);
      })
    : null;
  if (resizeObserver) {
    resizeObserver.observe(scrollElement);
    onCleanup(() => resizeObserver.disconnect());
  }

  const [virtualItems, setVirtualItems] = signal<VirtualItem[]>([]);
  const [totalSize, setTotalSize] = signal(0);

  effect(() => {
    const off = offsets();
    const n = itemCount();
    const view = viewport();
    const scroll = scrollOffset();
    setTotalSize(off[n] ?? 0);

    if (n === 0) { setVirtualItems([]); return; }

    // Binary search for first index whose end > scroll.
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (off[mid + 1] <= scroll) lo = mid + 1;
      else hi = mid;
    }
    const startIdx = Math.max(0, lo - overscan);

    // Walk forward until start of an item >= scroll + view.
    let endIdx = startIdx;
    while (endIdx < n && off[endIdx] < scroll + view) endIdx++;
    endIdx = Math.min(n - 1, endIdx + overscan);

    const items: VirtualItem[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      items.push({ index: i, start: off[i], size: off[i + 1] - off[i] });
    }
    setVirtualItems(items);
  });

  function scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
    const off = offsets();
    const start = off[index] ?? 0;
    const sz = (off[index + 1] ?? start) - start;
    const view = viewport();
    let target = start;
    if (align === 'center') target = start - view / 2 + sz / 2;
    else if (align === 'end') target = start - view + sz;
    target = Math.max(0, Math.min(target, (off[itemCount()] ?? 0) - view));
    if (horizontal) scrollElement.scrollLeft = target;
    else scrollElement.scrollTop = target;
  }

  return { virtualItems, totalSize, scrollToIndex, measure };
}
