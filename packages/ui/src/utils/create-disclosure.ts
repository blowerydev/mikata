import { signal, type ReadSignal } from '@mikata/reactivity';

export interface DisclosureReturn {
  opened: ReadSignal<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Manage open/close/toggle state.
 *
 * Usage:
 *   const { opened, open, close, toggle } = createDisclosure(false);
 */
export function createDisclosure(initialState = false): DisclosureReturn {
  const [opened, setOpened] = signal(initialState);

  return {
    opened,
    open: () => setOpened(true),
    close: () => setOpened(false),
    toggle: () => setOpened((v) => !v),
  };
}

/** @deprecated Use `createDisclosure` instead. */
export const useDisclosure = createDisclosure;
/** @deprecated Use `DisclosureReturn` instead. */
export type UseDisclosureReturn = DisclosureReturn;
