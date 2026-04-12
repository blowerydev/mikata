import { signal, effect, onCleanup, type ReadSignal } from '@mikata/reactivity';

/**
 * Returns a debounced view of a source signal — updates only after `delay` ms
 * of quiet. Useful for filter/search inputs that trigger expensive work.
 *
 * Usage:
 *   const [query, setQuery] = signal('');
 *   const debouncedQuery = createDebouncedSignal(query, 300);
 *   effect(() => fetchResults(debouncedQuery()));
 */
export function createDebouncedSignal<T>(
  source: ReadSignal<T>,
  delay: number
): ReadSignal<T> {
  const [debounced, setDebounced] = signal<T>(source());
  let timer: ReturnType<typeof setTimeout> | null = null;

  effect(() => {
    const value = source();
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      setDebounced(() => value);
    }, delay);
  });

  onCleanup(() => {
    if (timer !== null) clearTimeout(timer);
  });

  return debounced;
}
