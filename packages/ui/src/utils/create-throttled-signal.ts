import { signal, effect, onCleanup, type ReadSignal } from '@mikata/reactivity';

/**
 * Returns a throttled view of a source signal - updates at most once per
 * `interval` ms. The latest pending value is emitted when the throttle clears.
 *
 * Usage:
 *   const throttledScroll = createThrottledSignal(scrollY, 100);
 */
export function createThrottledSignal<T>(
  source: ReadSignal<T>,
  interval: number
): ReadSignal<T> {
  const [throttled, setThrottled] = signal<T>(source());
  let lastEmit = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | undefined;
  let hasPending = false;

  effect(() => {
    const value = source();
    const now = Date.now();
    const wait = interval - (now - lastEmit);

    if (wait <= 0) {
      lastEmit = now;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      hasPending = false;
      setThrottled(() => value);
    } else {
      pending = value;
      hasPending = true;
      if (timer === null) {
        timer = setTimeout(() => {
          timer = null;
          if (!hasPending) return;
          hasPending = false;
          lastEmit = Date.now();
          setThrottled(() => pending as T);
        }, wait);
      }
    }
  });

  onCleanup(() => {
    if (timer !== null) clearTimeout(timer);
  });

  return throttled;
}
