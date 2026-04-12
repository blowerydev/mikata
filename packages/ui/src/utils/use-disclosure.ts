import { signal, type ReadSignal, type WriteSignal } from '@mikata/reactivity';

export interface UseDisclosureReturn {
  opened: ReadSignal<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Manage open/close/toggle state.
 *
 * Usage:
 *   const { opened, open, close, toggle } = useDisclosure(false);
 */
export function useDisclosure(initialState = false): UseDisclosureReturn {
  const [opened, setOpened] = signal(initialState);

  return {
    opened,
    open: () => setOpened(true),
    close: () => setOpened(false),
    toggle: () => setOpened((v) => !v),
  };
}
