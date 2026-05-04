/**
 * Control flow primitives for conditional and list rendering.
 *
 * These are functions (not components) that return DOM nodes.
 * They manage their own reactive scopes for proper cleanup.
 */

import {
  renderEffect,
  createScope,
  createLazyScope,
  signal,
  type Scope,
} from '@mikata/reactivity';
import { _createComponent, disposeComponent } from './component';
import { isHydrating, adoptNext, pushFrame, popFrame } from './adopt';

declare const __DEV__: boolean;

/**
 * Conditional rendering. Renders `render` when `when` is truthy,
 * otherwise renders `fallback`.
 *
 * The truthy value is passed to the render function for type narrowing.
 *
 * Usage:
 *   show(
 *     () => user(),
 *     (user) => <Profile user={user} />,
 *     () => <LoginPage />
 *   )
 */
export function show<T>(
  when: () => T | null | undefined | false | 0 | '',
  render: (value: NonNullable<T>) => Node,
  fallback?: () => Node,
  options?: { keepAlive?: boolean },
): Node {
  if (options?.keepAlive) {
    return showKeepAlive(when, render, fallback);
  }

  let currentNode: Node = document.createComment('show');
  let currentScope: Scope | null = null;
  let currentBranch: 'render' | 'fallback' | 'none' = 'none';

  renderEffect(() => {
    const value = when();
    const newBranch = value ? 'render' : fallback ? 'fallback' : 'none';

    // Only swap if branch actually changed
    if (newBranch === currentBranch && newBranch === 'none') return;

    // Dispose previous scope
    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }

    let newNode: Node;

    if (value) {
      currentScope = createLazyScope(() => {
        newNode = render(value as NonNullable<T>);
      });
    } else if (fallback) {
      currentScope = createLazyScope(() => {
        newNode = fallback();
      });
    } else {
      newNode = document.createComment('show:empty');
    }

    // Swap in DOM
    if (currentNode.parentNode) {
      currentNode.parentNode.replaceChild(newNode!, currentNode);
    }
    currentNode = newNode!;
    currentBranch = newBranch;
  });

  return currentNode;
}

/**
 * keepAlive mode: render both branches on first visit, toggle `display: none`
 * on swap instead of unmounting. Effects inside each branch stay alive, so
 * input focus, scroll position, and in-flight queries persist across flips.
 *
 * Each branch is wrapped in a `display: contents` div so toggling visibility
 * doesn't introduce a layout box. Both wrappers stay in the DOM once created.
 * `render(value)` is called the first time `when` goes truthy; subsequent
 * truthy values do NOT re-run it - callers should read signals inside if
 * they want per-value updates.
 */
function showKeepAlive<T>(
  when: () => T | null | undefined | false | 0 | '',
  render: (value: NonNullable<T>) => Node,
  fallback?: () => Node,
): Node {
  const hydrating = isHydrating();
  const marker = document.createComment('show:keepAlive');
  // During hydration items are already in the real parent via adoption;
  // return the bare marker so `_insert`'s hydrate path (which doesn't
  // re-insert) doesn't leave an orphan fragment around.
  const container: Node = hydrating
    ? marker
    : (() => {
        const frag = document.createDocumentFragment();
        frag.appendChild(marker);
        return frag;
      })();

  let renderedWrapper: HTMLDivElement | null = null;
  let fallbackWrapper: HTMLDivElement | null = null;
  let hydrated = false;

  renderEffect(() => {
    const value = when();

    // One-shot hydration path: adopt the SSR-rendered wrapper that matches
    // the current branch. Must run while the caller's `_insert` frame is
    // still active so `adoptNext()` pops the wrapper and `render()`'s JSX
    // picks up its children.
    if (hydrating && !hydrated) {
      hydrated = true;
      const adopted = adoptNext();
      const wrapper =
        adopted && adopted.nodeType === 1 && (adopted as Element).tagName.toUpperCase() === 'DIV'
          ? (adopted as HTMLDivElement)
          : null;
      if (wrapper) {
        pushFrame(wrapper, 0);
        try {
          if (value) {
            renderedWrapper = wrapper;
            // Return value discarded: the adopted node is already wrapper's
            // child. The call exists only to let render's JSX wire events.
            render(value as NonNullable<T>);
          } else if (fallback) {
            fallbackWrapper = wrapper;
            fallback();
          }
        } finally {
          popFrame();
        }
        const realParent = wrapper.parentNode;
        if (realParent) {
          if (wrapper.nextSibling) realParent.insertBefore(marker, wrapper.nextSibling);
          else realParent.appendChild(marker);
        }
        return;
      }
      // Wrapper missing — fall through to the fresh-build path below.
    }

    const parent = marker.parentNode;
    if (!parent) return;

    if (value) {
      if (!renderedWrapper) {
        renderedWrapper = document.createElement('div');
        renderedWrapper.style.display = 'contents';
        renderedWrapper.appendChild(render(value as NonNullable<T>));
        parent.insertBefore(renderedWrapper, marker);
      }
      renderedWrapper.style.display = 'contents';
      if (fallbackWrapper) fallbackWrapper.style.display = 'none';
    } else {
      if (fallback && !fallbackWrapper) {
        fallbackWrapper = document.createElement('div');
        fallbackWrapper.style.display = 'contents';
        fallbackWrapper.appendChild(fallback());
        parent.insertBefore(fallbackWrapper, marker);
      }
      if (renderedWrapper) renderedWrapper.style.display = 'none';
      if (fallbackWrapper) fallbackWrapper.style.display = 'contents';
    }
  });

  return container;
}

/**
 * List rendering with keyed reconciliation.
 *
 * Renders each item in the list using the render function.
 * Items are keyed by reference identity by default.
 *
 * Usage:
 *   each(
 *     () => items,
 *     (item, index) => <Card item={item} />,
 *     () => <EmptyState />
 *   )
 */
export function each<T>(
  list: () => readonly T[],
  render: (item: T, index: () => number) => Node,
  fallback?: () => Node,
  options?: { key?: (item: T) => unknown; static?: boolean }
): Node {
  // During hydration the caller's `_insert` has already pushed a frame
  // for the real parent, so rendering each item inline lets its JSX
  // `cloneNode()` calls pop the SSR-rendered children via `adoptNext()`.
  // In that case we skip the fragment wrapper (items are already in the
  // real DOM) and splice the marker in after them so subsequent reactive
  // updates still have an anchor. Outside hydration we build into a
  // fragment as before — the caller flattens it into the real parent.
  const hydrating = isHydrating();
  const marker = document.createComment('each');
  const container: DocumentFragment | Comment = hydrating
    ? marker
    : (() => {
        const frag = document.createDocumentFragment();
        frag.appendChild(marker);
        return frag;
      })();

  type ItemEntry = {
    node: Node;
    scope: Scope | null;
    item: T;
    setIndex: (index: number) => void;
  };

  let entries: ItemEntry[] = [];
  let fallbackEntry: { node: Node; scope: Scope | null } | null = null;
  const keyFn = options?.key ?? ((item: T) => item);
  let hydrated = false;

  const createEntry = (item: T, i: number): ItemEntry => {
    let node: Node;
    let indexValue = i;
    let getIndex: (() => number) | null = null;
    let setIndexImpl: ((index: number) => void) | null = null;
    const index = () => {
      if (!getIndex) {
        const [get, set] = signal(indexValue);
        getIndex = get;
        setIndexImpl = set;
      }
      return getIndex();
    };
    const setIndex = (next: number) => {
      indexValue = next;
      setIndexImpl?.(next);
    };
    const scope = createLazyScope(() => {
      node = render(item, index);
    });
    return { node: node!, scope, item, setIndex };
  };

  if (options?.static && !hydrating) {
    const createStaticNode = (item: T, i: number): Node => {
      let node: Node;
      const index = () => i;
      createLazyScope(() => {
        node = render(item, index);
      });
      return node!;
    };
    const items = list();
    const frag = document.createDocumentFragment();
    if (items.length === 0 && fallback) {
      let fallbackNode: Node;
      createLazyScope(() => {
        fallbackNode = fallback();
      });
      frag.appendChild(fallbackNode!);
      return frag;
    }
    for (let i = 0; i < items.length; i++) {
      frag.appendChild(createStaticNode(items[i], i));
    }
    return frag;
  }

  const disposeEntry = (entry: ItemEntry): void => {
    if (entry.node.parentNode) {
      entry.node.parentNode.removeChild(entry.node);
    }
    entry.scope?.dispose();
  };

  renderEffect(() => {
    const items = list();

    // One-shot hydration path. Must run on the first effect invocation
    // while the caller's adoption frame is still active — subsequent
    // runs fire from signal changes long after `_insert` has popped.
    if (hydrating && !hydrated) {
      hydrated = true;
      if (items.length === 0) {
        // Fallback handling on an empty hydrated list falls through to
        // the regular build path below. The marker has no parent yet;
        // we'll get one the first time the fallback appears.
      } else {
        const fresh: ItemEntry[] = new Array(items.length);
        for (let i = 0; i < items.length; i++) {
          fresh[i] = createEntry(items[i], i);
        }
        entries = fresh;
        // Place marker after the last adopted item so future reactive
        // updates anchor against it. The adopted items are already in
        // the real parent via cloneNode → adoptNext.
        const hydrateParent = fresh[0].node.parentNode;
        if (hydrateParent) {
          const last = fresh[fresh.length - 1].node;
          if (last.nextSibling) {
            hydrateParent.insertBefore(marker, last.nextSibling);
          } else {
            hydrateParent.appendChild(marker);
          }
        }
        return;
      }
    }

    const parent = marker.parentNode;
    if (!parent) return;

    // Remove fallback if it exists
    if (fallbackEntry) {
      if (fallbackEntry.node.parentNode) {
        fallbackEntry.node.parentNode.removeChild(fallbackEntry.node);
      }
      fallbackEntry.scope?.dispose();
      fallbackEntry = null;
    }

    if (items.length === 0 && fallback) {
      // Show fallback
      for (const entry of entries) {
        disposeEntry(entry);
      }
      entries = [];

      let fallbackNode: Node;
      const scope = createLazyScope(() => {
        fallbackNode = fallback!();
      });
      parent.insertBefore(fallbackNode!, marker);
      fallbackEntry = { node: fallbackNode!, scope };
      return;
    }

    // Fast path: fresh list. Skip LIS bookkeeping, batch DOM writes into one
    // DocumentFragment insert. Cuts 10k insertBefore calls → 1.
    if (entries.length === 0) {
      const fresh: ItemEntry[] = new Array(items.length);
      const frag = document.createDocumentFragment();
      const seenKeys = __DEV__ ? new Set<unknown>() : null;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (__DEV__) {
          const key = keyFn(item);
          if (seenKeys!.has(key)) {
            console.warn(
              `[mikata] Duplicate key "${String(key)}" in each(). ` +
              `Duplicate keys will cause rendering issues. ` +
              `Provide a unique key function via the options argument.`
            );
          }
          seenKeys!.add(key);
        }
        const entry = createEntry(item, i);
        fresh[i] = entry;
        frag.appendChild(entry.node);
      }
      parent.insertBefore(frag, marker);
      entries = fresh;
      return;
    }

    // Build old-key -> oldIndex map so we can track which new positions
    // correspond to which old positions (needed for LIS-based move minimization).
    const oldKeyToIndex = new Map<unknown, number>();
    for (let i = 0; i < entries.length; i++) {
      oldKeyToIndex.set(keyFn(entries[i].item), i);
    }

    // Build new entries. `sources[i]` is the oldIndex for newEntries[i],
    // or -1 if newEntries[i] is freshly created.
    const newEntries: ItemEntry[] = new Array(items.length);
    const sources: number[] = new Array(items.length);
    const newKeys = new Set<unknown>();
    const reused = new Uint8Array(entries.length);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = keyFn(item);

      if (__DEV__ && newKeys.has(key)) {
        console.warn(
          `[mikata] Duplicate key "${String(key)}" in each(). ` +
          `Duplicate keys will cause rendering issues. ` +
          `Provide a unique key function via the options argument.`
        );
      }
      newKeys.add(key);

      const oldIndex = oldKeyToIndex.get(key);
      if (oldIndex !== undefined && !reused[oldIndex]) {
        reused[oldIndex] = 1;
        newEntries[i] = entries[oldIndex];
        newEntries[i].setIndex(i);
        sources[i] = oldIndex;
      } else {
        newEntries[i] = createEntry(item, i);
        sources[i] = -1;
      }
    }

    // Dispose removed entries (any old entry not reused).
    for (let i = 0; i < entries.length; i++) {
      if (reused[i]) continue;
      disposeEntry(entries[i]);
    }

    // Compute LIS of `sources` (ignoring -1 entries). Any reused entry whose
    // index sits in the LIS is already in the correct relative DOM position
    // and doesn't need to move — only non-LIS entries and freshly-created
    // entries are inserted. This turns a two-element swap in a 1000-item list
    // from ~1000 moves into 1.
    const lisIndices = longestIncreasingSubsequence(sources);
    let lisPtr = lisIndices.length - 1;
    let nextRef: Node = marker;
    for (let i = newEntries.length - 1; i >= 0; i--) {
      const node = newEntries[i].node;
      if (sources[i] !== -1 && lisPtr >= 0 && lisIndices[lisPtr] === i) {
        // In the LIS: leave in place, but it still anchors nextRef for items
        // to its left. DOM order of LIS nodes is already correct relative to
        // each other because LIS is increasing in oldIndex.
        lisPtr--;
      } else {
        if (node.nextSibling !== nextRef) {
          parent.insertBefore(node, nextRef);
        }
      }
      nextRef = node;
    }

    entries = newEntries;
  });

  return container;
}

/**
 * Patience-sort LIS over an array of oldIndex values. Entries with value -1
 * are treated as "not present in old list" and skipped. Returns the indices
 * (positions in `arr`) whose values form a longest strictly-increasing run.
 * O(n log n); adapted from the classic Vue 3 implementation.
 */
function longestIncreasingSubsequence(arr: readonly number[]): number[] {
  const n = arr.length;
  const predecessors: number[] = new Array(n);
  const tailIndices: number[] = [];

  for (let i = 0; i < n; i++) {
    const v = arr[i];
    if (v === -1) continue;

    const lastTail = tailIndices[tailIndices.length - 1];
    if (tailIndices.length === 0 || arr[lastTail] < v) {
      predecessors[i] = lastTail ?? -1;
      tailIndices.push(i);
      continue;
    }

    let lo = 0;
    let hi = tailIndices.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[tailIndices[mid]] < v) lo = mid + 1;
      else hi = mid;
    }
    if (v < arr[tailIndices[lo]]) {
      predecessors[i] = lo > 0 ? tailIndices[lo - 1] : -1;
      tailIndices[lo] = i;
    }
  }

  // Reconstruct by walking predecessors back from the last tail.
  let u = tailIndices.length;
  if (u === 0) return tailIndices;
  let v = tailIndices[u - 1];
  while (u-- > 0) {
    tailIndices[u] = v;
    v = predecessors[v];
  }
  return tailIndices;
}

/**
 * Switch/match rendering. Renders the matching case based on value.
 * TypeScript enforces exhaustive matching when T is a union type.
 *
 * Usage:
 *   switchMatch(
 *     () => status,
 *     {
 *       loading: () => <Spinner />,
 *       error: () => <ErrorIcon />,
 *       success: () => <CheckIcon />,
 *     }
 *   )
 */
export function switchMatch<T extends string | number>(
  value: () => T,
  cases: Partial<Record<T, () => Node>> & { default?: () => Node }
): Node {
  let currentNode: Node = document.createComment('switch');
  let currentScope: Scope | null = null;
  let currentCase: T | 'default' | null = null;

  renderEffect(() => {
    const val = value();

    if (val === currentCase) return;

    // Dispose previous
    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }

    const renderFn = (cases as any)[val] ?? cases.default;
    let newNode: Node;

    if (renderFn) {
      const scope = createScope(() => {
        newNode = renderFn();
      });
      currentScope = scope;
    } else {
      if (__DEV__) {
        console.warn(
          `[mikata] switchMatch() received value "${String(val)}" but no matching case or default was provided. ` +
          `Nothing will be rendered.`
        );
      }
      newNode = document.createComment('switch:empty');
    }

    if (currentNode.parentNode) {
      currentNode.parentNode.replaceChild(newNode!, currentNode);
    }
    currentNode = newNode!;
    currentCase = val;
  });

  return currentNode;
}

/**
 * Render a component whose identity can change at runtime. Reads
 * `props.component` reactively and re-instantiates when it changes,
 * forwarding all other props to the new component through reactive getters.
 *
 * The `component` prop may be `null`/`undefined` to render nothing.
 *
 * Usage:
 *   const kind = signal<'button' | 'link'>('button');
 *   const Current = computed(() => kind() === 'button' ? Button : Link);
 *   <Dynamic component={Current()} label="Click" onClick={handle} />
 */
type AnyComponent = (props: Record<string, unknown>) => Node | null;

interface DynamicProps {
  component: AnyComponent | null | undefined;
  [key: string]: unknown;
}

export function Dynamic(props: DynamicProps): Node {
  // Forward every prop except `component` via getter, so the inner component
  // sees live values even though we only build this bag once.
  const forwarded: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (key === 'component') continue;
    Object.defineProperty(forwarded, key, {
      get: () => props[key],
      enumerable: true,
      configurable: true,
    });
  }

  let currentNode: Node = document.createComment('dynamic');
  let currentComp: AnyComponent | null | undefined = undefined;
  let currentScope: Scope | null = null;

  renderEffect(() => {
    const Comp = props.component;
    if (Comp === currentComp) return;

    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }
    // Also dispose the previous rendered node's component scope if it was one.
    if (currentNode) disposeComponent(currentNode);

    let newNode: Node;
    if (!Comp) {
      newNode = document.createComment('dynamic:empty');
    } else {
      let instance: Node | null = null;
      const scope = createScope(() => {
        instance = _createComponent(Comp, forwarded);
      });
      currentScope = scope;
      newNode = instance!;
    }

    if (currentNode.parentNode) {
      currentNode.parentNode.replaceChild(newNode, currentNode);
    }
    currentNode = newNode;
    currentComp = Comp;
  });

  return currentNode;
}
