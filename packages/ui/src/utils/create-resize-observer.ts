import { signal, onCleanup, type ReadSignal } from '@mikata/reactivity';
import type { Ref } from '@mikata/runtime';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Track the size of a referenced element via `ResizeObserver`.
 *
 * Usage:
 *   const ref = createRef<HTMLDivElement>();
 *   const size = createResizeObserver(ref);
 *   effect(() => console.log(size().width));
 */
export function createResizeObserver(ref: Ref<Element>): ReadSignal<ElementSize> {
  const [size, setSize] = signal<ElementSize>({ width: 0, height: 0 });
  let observer: ResizeObserver | null = null;

  const attach = () => {
    const el = ref.current;
    if (!el || observer) return;
    observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize(() => ({ width: rect.width, height: rect.height }));
    });
    observer.observe(el);
  };

  queueMicrotask(attach);
  onCleanup(() => observer?.disconnect());

  return size;
}
