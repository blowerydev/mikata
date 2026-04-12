import { onCleanup, onMount } from '@mikata/runtime';
import type { Ref } from '@mikata/runtime';

const FOCUSABLE_SELECTOR =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), ' +
  'textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Trap focus within a container element.
 * Tab/Shift+Tab cycles within focusable elements.
 * Focus is restored to the previously focused element on cleanup.
 */
export function useFocusTrap(
  ref: Ref<HTMLElement>,
  options?: { initialFocus?: Ref<HTMLElement> }
): void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  onMount(() => {
    const container = ref.current;
    if (!container) return;

    const target = options?.initialFocus?.current;
    if (target) {
      target.focus();
    } else {
      const focusable = getFocusableElements(container);
      focusable[0]?.focus();
    }
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const container = ref.current;
    if (!container) return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', onKeyDown, true);

  onCleanup(() => {
    document.removeEventListener('keydown', onKeyDown, true);
    previouslyFocused?.focus();
  });
}
