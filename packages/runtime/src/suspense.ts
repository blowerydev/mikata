/**
 * Suspense - render a fallback until every registered async query has
 * resolved at least once. After the first successful mount of children,
 * the boundary stays "ready" and later refetches do not re-trigger the
 * fallback (use `isFetching` locally for per-query spinners).
 *
 * Queries opt in with `createQuery({ suspend: true })`. They locate the
 * nearest boundary by walking scope.contexts for a shared symbol, so
 * `@mikata/store` does not need to import from `@mikata/runtime`.
 */

import {
  signal,
  effect,
  untrack,
  createScope,
  getCurrentScope,
  type ReadSignal,
  type Scope,
} from '@mikata/reactivity';

/**
 * Wire protocol between `Suspense` (runtime) and `createQuery` (store):
 * both sides agree on this symbol via `Symbol.for` so neither package has
 * to import the other. The registered shape is `{ register(isLoading) }`.
 */
export const SUSPENSE_CONTEXT_KEY: symbol = Symbol.for('mikata:suspense-boundary');

export interface SuspenseBoundary {
  /** Called by a suspending async source at creation. */
  register(isLoading: ReadSignal<boolean>): void;
}

export interface SuspenseProps {
  /** Node (or a factory that returns one) shown while any registered query is in initial load. */
  fallback: Node | (() => Node);
  /**
   * Factory that returns the child nodes. Pass a function - not an already-
   * rendered node - so queries created inside run within the boundary's
   * scope and can auto-register. Components are eagerly evaluated in Mikata,
   * so a bare `_createComponent(Child, {})` would run outside the boundary.
   */
  children: () => Node | Node[];
}

/**
 * Render `fallback` until every query created inside `children` (with
 * `suspend: true`) has resolved once, then swap in `children`. Never
 * reverts back - refetches after the initial load do not re-trigger the
 * fallback.
 */
export function Suspense(props: SuspenseProps): Node {
  const container = document.createElement('div');
  container.style.display = 'contents';

  // Each registered query contributes its isLoading signal. loadingCount
  // is recomputed whenever any of them fires.
  const [loadings, setLoadings] = signal<ReadSignal<boolean>[]>([]);
  const [ready, setReady] = signal(false);

  const boundary: SuspenseBoundary = {
    register(isLoading) {
      if (untrack(ready)) return;
      setLoadings([...untrack(loadings), isLoading]);
    },
  };

  // Render children eagerly inside a scope that exposes the boundary.
  // This lets queries synchronously set their isLoading to true during
  // setup before we decide whether to show the fallback.
  const childFragment = document.createDocumentFragment();
  let childScope: Scope | null = null;
  childScope = createScope(() => {
    const s = getCurrentScope();
    if (s) s.setContext(SUSPENSE_CONTEXT_KEY, boundary);
    const raw = props.children();
    const children = Array.isArray(raw) ? raw : [raw];
    for (const c of children) {
      if (c instanceof Node) childFragment.appendChild(c);
      else if (c != null) childFragment.appendChild(document.createTextNode(String(c)));
    }
  });

  // Flip to ready the first time every registered query has cleared.
  // Sticky: we don't track `ready` inside this effect, so once set to true
  // the effect keeps watching but the early-return guards against regressions.
  effect(() => {
    const list = loadings();
    if (list.length === 0 && !untrack(ready)) {
      setReady(true);
      return;
    }
    const anyLoading = list.some((s) => s());
    if (!anyLoading && !untrack(ready)) {
      setReady(true);
    }
  });

  // Swap the visible subtree based on `ready`. We never revert children →
  // fallback once shown.
  const fallbackNode =
    typeof props.fallback === 'function' ? (props.fallback as () => Node)() : props.fallback;
  let mountedChildren = false;
  effect(() => {
    const r = ready();
    if (r && !mountedChildren) {
      container.textContent = '';
      container.appendChild(childFragment);
      mountedChildren = true;
    } else if (!r && !mountedChildren && !container.firstChild) {
      container.appendChild(fallbackNode);
    }
  });

  // Clean up the child scope when the boundary itself disposes.
  const parent = getCurrentScope();
  parent?.addCleanup(() => {
    childScope?.dispose();
  });

  return container;
}
