import type { Ref } from '@mikata/runtime';

/**
 * Forward an element to multiple refs / ref callbacks. Returns a callback
 * that, when attached via `ref`, populates each target in turn.
 *
 * Usage:
 *   <div ref={mergeRefs(localRef, props.ref)} />
 */
export function mergeRefs<T>(
  ...refs: (Ref<T> | ((el: T | null) => void) | null | undefined)[]
): (el: T | null) => void {
  return (el) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') {
        (ref as (el: T | null) => void)(el);
      } else {
        (ref as { current: T | null }).current = el;
      }
    }
  };
}
