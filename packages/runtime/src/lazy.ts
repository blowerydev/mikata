/**
 * lazy() - code-split components via dynamic import().
 *
 * Wraps a dynamic import that resolves to a component module.
 * Returns a component function that renders a fallback while loading,
 * then swaps in the real component once loaded. On error, renders
 * an error fallback if provided.
 *
 * Usage:
 *   const Dashboard = lazy(() => import('./Dashboard'));
 *
 *   // With fallback:
 *   const Dashboard = lazy(() => import('./Dashboard'), {
 *     fallback: () => <Spinner />,
 *     error: (err, retry) => <button onClick={retry}>Retry</button>,
 *   });
 *
 *   // In JSX - used like any other component:
 *   <Dashboard userId={userId()} />
 */

import {
  createScope,
  getCurrentScope,
  setCurrentScope,
  type Scope,
} from '@mikata/reactivity';
import { _createComponent, disposeComponent } from './component';

declare const __DEV__: boolean;

/**
 * Options for lazy().
 */
export interface LazyOptions {
  /** Rendered while the dynamic import is in flight */
  fallback?: () => Node;
  /** Rendered if the dynamic import fails. Receives the error and a retry function. */
  error?: (err: Error, retry: () => void) => Node;
}

/**
 * The shape of a module that exports a component.
 * Supports both default exports and named exports.
 */
type ComponentModule<P extends Record<string, unknown>> = {
  default: (props: P) => Node | null;
} | {
  [key: string]: (props: P) => Node | null;
};

/**
 * Create a lazy-loaded component wrapper.
 *
 * The loader function should return a dynamic import() that resolves
 * to a module with a default export (the component function).
 */
/**
 * A lazy component is callable like a normal component, with a
 * `preload()` method bolted on for prefetching. Preloading on hover
 * or during route preparation lets `lazy()` resolve synchronously
 * on the first real render — which is what hydration needs, since a
 * placeholder node during hydration breaks adoption.
 */
export type LazyComponentFn<P extends Record<string, unknown>> = ((
  props: P,
) => Node) & {
  preload(): Promise<void>;
};

export function lazy<P extends Record<string, unknown>>(
  loader: () => Promise<{ default: (props: P) => Node | null }>,
  options?: LazyOptions
): LazyComponentFn<P> {
  let resolved: ((props: P) => Node | null) | null = null;
  let loadError: Error | null = null;
  let loadPromise: Promise<void> | null = null;

  function load(): Promise<void> {
    if (loadPromise) return loadPromise;

    loadPromise = loader()
      .then((mod) => {
        resolved = mod.default;
        loadError = null;
        if (__DEV__ && typeof resolved !== 'function') {
          console.error(
            `[mikata] lazy() loaded a module that does not have a default export. ` +
            `The module should export a component function as its default export.`
          );
        }
      })
      .catch((err) => {
        loadError = err instanceof Error ? err : new Error(String(err));
        loadPromise = null; // allow retry
        if (__DEV__) {
          console.error(`[mikata] lazy() failed to load component:`, err);
        }
      });

    return loadPromise;
  }

  function LazyComponent(props: P): Node {
    // Already resolved - render immediately
    if (resolved) {
      return _createComponent(resolved, props);
    }

    // Create a placeholder that swaps when loaded
    const container = document.createElement('div');
    container.style.display = 'contents';

    let currentScope: Scope | null = null;
    let currentNode: Node | null = null;
    // Capture the scope that owned us at call time so the post-load
    // swap sees the same context chain (router, loader data, etc.)
    // even though it fires from a microtask where `currentScope` would
    // otherwise be null.
    const ownerScope = getCurrentScope();
    function runInOwner<T>(fn: () => T): T {
      const prev = setCurrentScope(ownerScope);
      try {
        return fn();
      } finally {
        setCurrentScope(prev);
      }
    }

    function renderFallback() {
      clear();
      if (options?.fallback) {
        currentScope = runInOwner(() =>
          createScope(() => {
            currentNode = options.fallback!();
            container.appendChild(currentNode);
          }),
        );
      } else {
        currentNode = document.createComment('lazy:loading');
        container.appendChild(currentNode);
      }
    }

    function renderError(err: Error) {
      clear();
      if (options?.error) {
        currentScope = runInOwner(() =>
          createScope(() => {
            currentNode = options.error!(err, retry);
            container.appendChild(currentNode);
          }),
        );
      } else {
        if (__DEV__) {
          currentNode = document.createComment(`lazy:error - ${err.message}`);
        } else {
          currentNode = document.createComment('lazy:error');
        }
        container.appendChild(currentNode);
      }
    }

    function renderComponent() {
      clear();
      if (resolved) {
        currentScope = runInOwner(() =>
          createScope(() => {
            currentNode = _createComponent(resolved!, props);
            container.appendChild(currentNode);
          }),
        );
      }
    }

    function clear() {
      if (currentNode && currentNode.parentNode) {
        disposeComponent(currentNode);
        currentNode.parentNode.removeChild(currentNode);
      }
      if (currentScope) {
        currentScope.dispose();
        currentScope = null;
      }
      currentNode = null;
    }

    function retry() {
      loadError = null;
      loadPromise = null;
      renderFallback();
      load().then(() => {
        // Only swap if we're still in the DOM
        if (!container.parentNode && !container.isConnected) return;
        if (resolved) {
          renderComponent();
        } else if (loadError) {
          renderError(loadError);
        }
      });
    }

    // Show fallback while loading
    renderFallback();

    // Start loading
    load().then(() => {
      // Only swap if we're still in the DOM
      if (!container.parentNode && !container.isConnected) return;
      if (resolved) {
        renderComponent();
      } else if (loadError) {
        renderError(loadError);
      }
    });

    return container;
  }

  // Preserve name for devtools
  Object.defineProperty(LazyComponent, 'name', {
    value: `Lazy(${loader.name || '...'})`,
  });

  /**
   * Preload the component without rendering it.
   * Useful for prefetching on hover or route preparation.
   */
  (LazyComponent as LazyComponentFn<P>).preload = (): Promise<void> => load();

  return LazyComponent as LazyComponentFn<P>;
}
