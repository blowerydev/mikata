import { effect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { createVirtualizer } from './virtualizer';
import type { VirtualListProps } from './VirtualList.types';
import './VirtualList.css';

/**
 * VirtualList - thin component wrapper over `createVirtualizer`. For more
 * control (programmatic scrolling, custom layouts), use the virtualizer
 * directly with your own scroll container.
 */
export function VirtualList<T>(userProps: VirtualListProps<T>): HTMLElement {
  const props = { ...useComponentDefaults<VirtualListProps<T>>('VirtualList'), ...userProps };
  const {
    data,
    itemSize,
    renderItem,
    overscan = 3,
    size,
    orientation = 'vertical',
    classNames,
    class: className,
    ref,
  } = props;

  const horizontal = orientation === 'horizontal';

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-virtual-list', className, classNames?.root);
  root.dataset.orientation = orientation;
  if (size != null) {
    if (horizontal) root.style.width = `${size}px`;
    else root.style.height = `${size}px`;
  }

  const inner = document.createElement('div');
  inner.className = mergeClasses('mkt-virtual-list__inner', classNames?.inner);
  root.appendChild(inner);

  const virtualizer = createVirtualizer({
    count: data.length,
    itemSize,
    overscan,
    scrollElement: root,
    orientation,
  });

  // Item node cache keyed by index so we don't re-render unchanged items.
  const nodeCache = new Map<number, HTMLElement>();

  effect(() => {
    const total = virtualizer.totalSize();
    if (horizontal) { inner.style.width = `${total}px`; inner.style.height = '100%'; }
    else { inner.style.height = `${total}px`; inner.style.width = '100%'; }
  });

  effect(() => {
    const items = virtualizer.virtualItems();
    const visibleIndexes = new Set(items.map((i) => i.index));

    // Remove items that are no longer visible.
    for (const [idx, el] of nodeCache) {
      if (!visibleIndexes.has(idx)) {
        el.remove();
        nodeCache.delete(idx);
      }
    }

    // Mount/update visible items.
    for (const item of items) {
      let el = nodeCache.get(item.index);
      if (!el) {
        el = document.createElement('div');
        el.className = mergeClasses('mkt-virtual-list__item', classNames?.item);
        el.dataset.index = String(item.index);
        const node = renderItem(data[item.index], item.index);
        el.appendChild(node);
        inner.appendChild(el);
        nodeCache.set(item.index, el);
      }
      if (horizontal) {
        el.style.transform = `translateX(${item.start}px)`;
        el.style.width = `${item.size}px`;
      } else {
        el.style.transform = `translateY(${item.start}px)`;
        el.style.height = `${item.size}px`;
        el.style.width = '100%';
      }
    }
  });

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
