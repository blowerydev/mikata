/**
 * Control flow primitives for conditional and list rendering.
 *
 * These are functions (not components) that return DOM nodes.
 * They manage their own reactive scopes for proper cleanup.
 */

import {
  renderEffect,
  createScope,
  type Scope,
} from '@mikata/reactivity';
import { _createComponent, disposeComponent } from './component';

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
      const scope = createScope(() => {
        newNode = render(value as NonNullable<T>);
      });
      currentScope = scope;
    } else if (fallback) {
      const scope = createScope(() => {
        newNode = fallback();
      });
      currentScope = scope;
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
  const container = document.createDocumentFragment();
  const marker = document.createComment('show:keepAlive');
  container.appendChild(marker);

  let renderedWrapper: HTMLDivElement | null = null;
  let fallbackWrapper: HTMLDivElement | null = null;

  renderEffect(() => {
    const value = when();
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
  options?: { key?: (item: T) => unknown }
): Node {
  const container = document.createDocumentFragment();
  const marker = document.createComment('each');
  container.appendChild(marker);

  type ItemEntry = {
    node: Node;
    scope: Scope;
    item: T;
  };

  let entries: ItemEntry[] = [];
  let fallbackEntry: { node: Node; scope: Scope } | null = null;
  const keyFn = options?.key ?? ((item: T) => item);

  renderEffect(() => {
    const items = list();
    const parent = marker.parentNode;
    if (!parent) return;

    // Remove fallback if it exists
    if (fallbackEntry) {
      if (fallbackEntry.node.parentNode) {
        fallbackEntry.node.parentNode.removeChild(fallbackEntry.node);
      }
      fallbackEntry.scope.dispose();
      fallbackEntry = null;
    }

    if (items.length === 0 && fallback) {
      // Show fallback
      for (const entry of entries) {
        if (entry.node.parentNode) {
          entry.node.parentNode.removeChild(entry.node);
        }
        entry.scope.dispose();
      }
      entries = [];

      let fallbackNode: Node;
      const scope = createScope(() => {
        fallbackNode = fallback!();
      });
      parent.insertBefore(fallbackNode!, marker);
      fallbackEntry = { node: fallbackNode!, scope };
      return;
    }

    // Build a map of existing entries by key
    const oldMap = new Map<unknown, ItemEntry>();
    for (const entry of entries) {
      oldMap.set(keyFn(entry.item), entry);
    }

    // Build new entries
    const newEntries: ItemEntry[] = [];
    const newKeys = new Set<unknown>();

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

      const existing = oldMap.get(key);
      if (existing) {
        // Reuse existing entry
        newEntries.push(existing);
        oldMap.delete(key);
      } else {
        // Create new entry
        let node: Node;
        const idx = i;
        const scope = createScope(() => {
          node = render(item, () => idx);
        });
        newEntries.push({ node: node!, scope, item });
      }
    }

    // Dispose removed entries
    for (const entry of oldMap.values()) {
      if (entry.node.parentNode) {
        entry.node.parentNode.removeChild(entry.node);
      }
      entry.scope.dispose();
    }

    // Reconcile: only move/insert nodes that are out of position.
    // Walk backwards from the end. `nextRef` is the node that should
    // come after the current entry. Initially it's the marker.
    // If the entry's node is already right before nextRef, skip it.
    // Otherwise insertBefore to put it in the correct position.
    let nextRef: Node = marker;
    for (let i = newEntries.length - 1; i >= 0; i--) {
      const node = newEntries[i].node;
      if (node.nextSibling !== nextRef) {
        parent.insertBefore(node, nextRef);
      }
      nextRef = node;
    }

    entries = newEntries;
  });

  return container;
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
