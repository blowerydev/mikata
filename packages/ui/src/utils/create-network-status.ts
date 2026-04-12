import { signal, onCleanup, type ReadSignal } from '@mikata/reactivity';

/**
 * Track `navigator.onLine`. Updates when the browser fires online/offline.
 *
 * Usage:
 *   const online = createNetworkStatus();
 *   show({ when: () => !online(), children: <OfflineBanner /> });
 */
export function createNetworkStatus(): ReadSignal<boolean> {
  const [online, setOnline] = signal(navigator.onLine);
  const onUp = () => setOnline(true);
  const onDown = () => setOnline(false);
  window.addEventListener('online', onUp);
  window.addEventListener('offline', onDown);
  onCleanup(() => {
    window.removeEventListener('online', onUp);
    window.removeEventListener('offline', onDown);
  });
  return online;
}
