import { signal, type ReadSignal } from '@mikata/reactivity';

export type OS = 'macos' | 'ios' | 'windows' | 'android' | 'linux' | 'undetermined';

/**
 * Detect the operating system from the user agent. Runs once at creation;
 * returns a signal for API symmetry with other `create*` helpers.
 *
 * Usage:
 *   const os = createOs();
 *   const modKey = os() === 'macos' ? '⌘' : 'Ctrl';
 */
export function createOs(): ReadSignal<OS> {
  const detect = (): OS => {
    if (typeof navigator === 'undefined') return 'undetermined';
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Mac/.test(ua)) return 'macos';
    if (/Windows/.test(ua)) return 'windows';
    if (/Android/.test(ua)) return 'android';
    if (/Linux/.test(ua)) return 'linux';
    return 'undetermined';
  };
  const [os] = signal<OS>(detect());
  return os;
}
