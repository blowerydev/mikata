import { signal, onCleanup, type ReadSignal } from '@mikata/reactivity';

export interface IntervalReturn {
  active: ReadSignal<boolean>;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

/**
 * Run a callback at a fixed interval. Start/stop/toggle controls.
 *
 * Usage:
 *   const { active, start, stop } = createInterval(() => console.log('tick'), 1000);
 *   start();
 */
export function createInterval(
  callback: () => void,
  delay: number,
  options?: { autoStart?: boolean }
): IntervalReturn {
  const [active, setActive] = signal(false);
  let id: ReturnType<typeof setInterval> | null = null;

  const start = () => {
    if (id !== null) return;
    id = setInterval(callback, delay);
    setActive(true);
  };

  const stop = () => {
    if (id === null) return;
    clearInterval(id);
    id = null;
    setActive(false);
  };

  const toggle = () => {
    if (active()) stop();
    else start();
  };

  if (options?.autoStart) start();
  onCleanup(stop);

  return { active, start, stop, toggle };
}
