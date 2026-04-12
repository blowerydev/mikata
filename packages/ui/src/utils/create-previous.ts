import { signal, effect, type ReadSignal } from '@mikata/reactivity';

/**
 * Track the previous value of a signal.
 * Returns `undefined` until the source has changed at least once.
 *
 * Usage:
 *   const [count, setCount] = signal(0);
 *   const prevCount = createPrevious(count);
 *   effect(() => console.log(prevCount(), '->', count()));
 */
export function createPrevious<T>(source: ReadSignal<T>): ReadSignal<T | undefined> {
  const [prev, setPrev] = signal<T | undefined>(undefined);
  let current: T = source();
  let first = true;

  effect(() => {
    const next = source();
    if (first) {
      first = false;
      current = next;
      return;
    }
    const old = current;
    current = next;
    setPrev(() => old);
  });

  return prev;
}
