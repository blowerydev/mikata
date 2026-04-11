/**
 * Hot Module Replacement (HMR) support for Mikata.
 *
 * The compiler injects HMR boundary code that registers component
 * functions and accepts hot updates. When a module is updated, the
 * runtime swaps the component function and re-renders affected instances.
 *
 * State is NOT preserved across HMR — components re-run from scratch
 * with fresh state. This matches SolidJS's approach: since components
 * are setup functions that run once, preserving the old reactive scope
 * while running new setup code would create inconsistencies.
 */

import { createScope, type Scope } from '@mikata/reactivity';
import { _createComponent, disposeComponent } from './component';

declare const __DEV__: boolean;

/**
 * A tracked component instance that can be re-rendered on HMR.
 */
interface HMRComponentInstance {
  /** The DOM node this component rendered */
  node: Node;
  /** The reactive scope for this instance */
  scope: Scope;
  /** The props passed to this instance */
  props: Record<string, unknown>;
  /** The container/parent node */
  parent: Node | null;
  /** Sibling reference for reinsertion */
  nextSibling: Node | null;
}

/**
 * Registry mapping component IDs to their latest function and active instances.
 */
interface HMRRegistryEntry {
  /** The latest version of the component function */
  current: (props: any) => Node | null;
  /** All live instances of this component */
  instances: Set<HMRComponentInstance>;
}

const registry = new Map<string, HMRRegistryEntry>();

/**
 * Register a component function for HMR tracking.
 * Called by the compiler-injected code.
 *
 * Returns a proxy component function that:
 * 1. Always delegates to the latest registered version
 * 2. Tracks instances for later replacement
 */
export function _registerComponent<P extends Record<string, unknown>>(
  id: string,
  Comp: (props: P) => Node | null
): (props: P) => Node | null {
  let entry = registry.get(id);
  if (!entry) {
    entry = { current: Comp, instances: new Set() };
    registry.set(id, entry);
  }
  // Always update to latest version
  entry.current = Comp;

  // Return a proxy that delegates to the latest version and tracks instances
  function HMRProxy(props: P): Node | null {
    const currentEntry = registry.get(id);
    if (!currentEntry) return Comp(props);

    const result = currentEntry.current(props);
    if (!result) return result;

    // Track this instance
    const instance: HMRComponentInstance = {
      node: result,
      scope: null as unknown as Scope, // Scope is attached by _createComponent
      props: props as Record<string, unknown>,
      parent: null,
      nextSibling: null,
    };
    currentEntry.instances.add(instance);

    // Set up a MutationObserver or schedule a microtask to capture parent
    queueMicrotask(() => {
      instance.parent = result.parentNode;
      instance.nextSibling = result.nextSibling;
    });

    return result;
  }

  // Copy over the original name for debugging
  Object.defineProperty(HMRProxy, 'name', { value: Comp.name || id });

  return HMRProxy;
}

/**
 * Accept a hot update for a component.
 * Called by the compiler-injected `import.meta.hot.accept()` callback.
 *
 * Replaces all active instances with the new component version.
 */
export function _hotReplace(id: string, NewComp: (props: any) => Node | null): void {
  const entry = registry.get(id);
  if (!entry) {
    // First registration — nothing to replace
    registry.set(id, { current: NewComp, instances: new Set() });
    return;
  }

  // Update the current function
  entry.current = NewComp;

  // Re-render all live instances
  const instancesToUpdate = [...entry.instances];
  entry.instances.clear();

  for (const instance of instancesToUpdate) {
    const { node, props } = instance;
    const parent = node.parentNode;
    if (!parent) continue;

    const nextSibling = node.nextSibling;

    // Dispose old component scope
    disposeComponent(node);
    parent.removeChild(node);

    // Create new instance — the proxy will track it automatically
    try {
      const newNode = _createComponent(NewComp, props);
      parent.insertBefore(newNode, nextSibling);
    } catch (err) {
      // On error, insert an error overlay instead of crashing
      if (__DEV__) {
        const errorNode = document.createElement('div');
        errorNode.style.cssText =
          'padding:16px;margin:8px;background:#fef2f2;border:2px solid #ef4444;' +
          'border-radius:8px;color:#991b1b;font-family:monospace;white-space:pre-wrap;font-size:13px';
        errorNode.textContent = `[HMR] Error re-rendering component:\n${(err as Error).message}\n\n${(err as Error).stack ?? ''}`;
        parent.insertBefore(errorNode, nextSibling);

        // Track this error node so the next successful HMR can replace it
        const errorInstance: HMRComponentInstance = {
          node: errorNode,
          scope: null as unknown as Scope,
          props,
          parent,
          nextSibling,
        };
        entry.instances.add(errorInstance);
      }
      console.error('[mikata:hmr] Error during hot replacement:', err);
    }
  }

  if (__DEV__) {
    console.log(`[mikata:hmr] Updated ${instancesToUpdate.length} instance(s) of component "${id}"`);
  }
}

/**
 * Check if HMR is active (Vite dev server running).
 */
export function _isHMRActive(): boolean {
  try {
    // @ts-expect-error — import.meta.hot is Vite-specific
    return !!import.meta.hot;
  } catch {
    return false;
  }
}

/**
 * Create a stable HMR component ID from file path and component name.
 */
export function createHMRId(filePath: string, componentName: string): string {
  return `${filePath}::${componentName}`;
}
