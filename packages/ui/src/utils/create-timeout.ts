import { onCleanup } from '@mikata/reactivity';

export interface TimeoutReturn {
  start: (...args: unknown[]) => void;
  clear: () => void;
}

/**
 * Call a function after a delay. Start/clear controls.
 * Cleared automatically on scope cleanup.
 *
 * Usage:
 *   const { start, clear } = createTimeout(() => save(), 500);
 *   start();
 */
export function createTimeout(
  callback: (...args: unknown[]) => void,
  delay: number,
  options?: { autoStart?: boolean }
): TimeoutReturn {
  let id: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (id === null) return;
    clearTimeout(id);
    id = null;
  };

  const start = (...args: unknown[]) => {
    clear();
    id = setTimeout(() => {
      id = null;
      callback(...args);
    }, delay);
  };

  if (options?.autoStart) start();
  onCleanup(clear);

  return { start, clear };
}
