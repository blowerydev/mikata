import { signal, onCleanup, type ReadSignal } from '@mikata/reactivity';

const DEFAULT_EVENTS: (keyof DocumentEventMap)[] = [
  'keypress',
  'mousemove',
  'touchmove',
  'click',
  'scroll',
];

/**
 * Track whether the user has been idle for `timeout` ms. Flips back to
 * active on any of the configured events.
 *
 * Usage:
 *   const idle = createIdle(60000);
 *   effect(() => idle() && showScreensaver());
 */
export function createIdle(
  timeout: number,
  options?: { events?: (keyof DocumentEventMap)[] }
): ReadSignal<boolean> {
  const events = options?.events ?? DEFAULT_EVENTS;
  const [idle, setIdle] = signal(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const reset = () => {
    if (idle()) setIdle(false);
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => setIdle(true), timeout);
  };

  for (const ev of events) {
    document.addEventListener(ev, reset, { passive: true });
  }
  reset();

  onCleanup(() => {
    if (timer !== null) clearTimeout(timer);
    for (const ev of events) {
      document.removeEventListener(ev, reset);
    }
  });

  return idle;
}
