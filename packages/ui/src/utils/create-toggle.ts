import { signal, type ReadSignal } from '@mikata/reactivity';

export interface ToggleReturn<T> {
  value: ReadSignal<T>;
  toggle: (next?: T) => void;
  set: (next: T) => void;
}

/**
 * Cycle through a list of values. Call `toggle()` to move to the next, or
 * `toggle(value)` to jump to a specific one.
 *
 * Usage:
 *   const { value, toggle } = createToggle(['light', 'dark']);
 *   toggle(); // 'dark'
 *   toggle(); // 'light'
 */
export function createToggle<T>(options: readonly [T, T, ...T[]]): ToggleReturn<T> {
  const [value, setValue] = signal<T>(options[0]);

  const toggle = (next?: T) => {
    if (next !== undefined) {
      setValue(next);
      return;
    }
    const current = value();
    const idx = options.indexOf(current);
    const nextIdx = (idx + 1) % options.length;
    setValue(options[nextIdx] as T);
  };

  const set = (next: T) => setValue(next);

  return { value, toggle, set };
}
