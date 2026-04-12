import { signal, onCleanup, type ReadSignal } from '@mikata/reactivity';

/**
 * Reactive wrapper around `matchMedia`.
 * Returns a signal that updates when the media query match changes.
 *
 * Usage:
 *   const isMobile = createMediaQuery('(max-width: 768px)');
 *   effect(() => console.log('Mobile:', isMobile()));
 */
export function createMediaQuery(query: string): ReadSignal<boolean> {
  const mql = window.matchMedia(query);
  const [matches, setMatches] = signal(mql.matches);

  const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
  mql.addEventListener('change', handler);
  onCleanup(() => mql.removeEventListener('change', handler));

  return matches;
}

/** @deprecated Use `createMediaQuery` instead. */
export const useMediaQuery = createMediaQuery;
