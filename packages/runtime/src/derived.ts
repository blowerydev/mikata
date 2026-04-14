import { computed, type ReadSignal } from '@mikata/reactivity';

/**
 * Mirror a reactive getter (typically a prop read) into a signal so code that
 * would otherwise destructure and lose reactivity can read a stable value.
 *
 * Solves the "setup-once trap": `const { label } = props` reads the getter
 * once and freezes to a string. `createDerivedSignal(() => props.label, '')`
 * returns a `ReadSignal<string>` whose value tracks subsequent prop changes.
 *
 * The fallback is used whenever the getter returns `null` or `undefined`.
 *
 * Usage:
 *   function TextInput(props: { label?: string }) {
 *     const label = createDerivedSignal(() => props.label, '');
 *     // label() always reflects the current prop value
 *   }
 */
export function createDerivedSignal<T>(
  getter: () => T | null | undefined,
  fallback: T,
): ReadSignal<T> {
  return computed(() => {
    const v = getter();
    return v == null ? fallback : v;
  });
}
