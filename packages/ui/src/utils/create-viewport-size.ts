import { signal, onCleanup, type ReadSignal } from '@mikata/reactivity';

export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Track the viewport dimensions. Updates on window resize.
 *
 * Usage:
 *   const size = createViewportSize();
 *   effect(() => console.log(size().width, size().height));
 */
export function createViewportSize(): ReadSignal<ViewportSize> {
  const read = (): ViewportSize => ({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [size, setSize] = signal<ViewportSize>(read());

  const handler = () => setSize(read());
  window.addEventListener('resize', handler);
  window.addEventListener('orientationchange', handler);
  onCleanup(() => {
    window.removeEventListener('resize', handler);
    window.removeEventListener('orientationchange', handler);
  });

  return size;
}
