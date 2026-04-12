/**
 * Component creation and lifecycle.
 *
 * Components are plain functions that run once (setup pattern).
 * Each component gets its own reactive scope for automatic cleanup.
 */

import { createScope, onCleanup, type Scope } from '@mikata/reactivity';
import { trackComponent, untrackComponent } from './devtools';

declare const __DEV__: boolean;

const SCOPE_KEY = '__mikata_scope';

/**
 * Create a component instance. Called by the compiled JSX output
 * for uppercase JSX tags (e.g., <Counter />).
 *
 * Wraps the component function in a reactive scope so all effects
 * created inside are automatically disposed when the component is removed.
 */
export function _createComponent<P extends Record<string, unknown>>(
  Comp: (props: P) => Node | null,
  props: P
): Node {
  // Freeze props in dev so `props.foo = x` throws a clear TypeError instead of
  // silently mutating the parent's prop bag. `freeze` is shallow and doesn't
  // interfere with getter-backed reactive props — it only blocks reassignment.
  if (__DEV__ && props && typeof props === 'object' && !Object.isFrozen(props)) {
    Object.freeze(props);
  }
  let result: Node | null = null;
  const scope = createScope(() => {
    result = Comp(props);
  });
  if (__DEV__) {
    scope.label = Comp.name || 'Anonymous';
  }

  if (!result) {
    if (__DEV__) {
      console.warn(
        `[mikata] Component "${Comp.name || 'Anonymous'}" returned null or undefined. ` +
        `Components should return a DOM node.`
      );
    }
    result = document.createComment('empty component');
  }

  // Attach scope to the root node for cleanup
  (result as any)[SCOPE_KEY] = scope;

  if (__DEV__) {
    trackComponent(Comp.name || 'Anonymous', result);
  }

  return result;
}

/**
 * Dispose a component's reactive scope.
 * Called when a component's root node is removed from the DOM.
 */
export function disposeComponent(node: Node): void {
  if (__DEV__) {
    untrackComponent(node);
  }
  const scope = (node as any)[SCOPE_KEY] as Scope | undefined;
  if (scope) {
    scope.dispose();
    delete (node as any)[SCOPE_KEY];
  }
}

/**
 * Register a callback to run after the component is mounted to the DOM.
 */
export function onMount(fn: () => void): void {
  // Schedule after the current synchronous setup completes
  queueMicrotask(fn);
}

// onCleanup is re-exported from @mikata/reactivity
export { onCleanup };

/**
 * A mutable ref container for holding a DOM element reference.
 */
export interface Ref<T = HTMLElement> {
  current: T | null;
  /** Call with an element to set .current — usable as a ref callback */
  (el: T): void;
}

/**
 * Create a ref for capturing a DOM element from JSX.
 *
 * Can be used as a callback (`ref={myRef}`) or read via `.current`:
 *   const myRef = createRef<HTMLInputElement>();
 *   <input ref={myRef} />
 *   onMount(() => myRef.current?.focus());
 */
export function createRef<T = HTMLElement>(): Ref<T> {
  const ref = ((el: T) => {
    ref.current = el;
  }) as Ref<T>;
  ref.current = null;
  return ref;
}

/**
 * Helper to destructure props while preserving reactivity.
 * The compiler can use this to make props destructuring work.
 *
 * Each destructured prop becomes a getter that delegates to the
 * original props object, preserving any getter-based reactivity.
 */
export function _destructureProps<T extends Record<string, unknown>>(
  props: T,
  keys: (keyof T)[]
): T {
  const result = {} as T;
  for (const key of keys) {
    Object.defineProperty(result, key, {
      get() {
        return props[key];
      },
      enumerable: true,
      configurable: true,
    });
  }
  return result;
}
