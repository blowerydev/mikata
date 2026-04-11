/**
 * Transition primitives for animated enter/exit of DOM nodes.
 *
 * transition()      — like show() but with enter/exit animations
 * transitionGroup() — like each() but with per-item enter/exit animations
 *
 * Supports both CSS class-based transitions (like Vue's <Transition>)
 * and JavaScript animation hooks (for GSAP, Web Animations API, etc).
 *
 * CSS class convention (same as Vue):
 *   {name}-enter-from   → applied at insert, removed after one frame
 *   {name}-enter-active → applied during entire enter phase
 *   {name}-enter-to     → applied after one frame, removed when enter ends
 *   {name}-leave-from   → applied at removal start, removed after one frame
 *   {name}-leave-active → applied during entire leave phase
 *   {name}-leave-to     → applied after one frame, removed when leave ends
 */

import {
  renderEffect,
  createScope,
  type Scope,
} from '@mikata/reactivity';

declare const __DEV__: boolean;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransitionOptions {
  /**
   * CSS transition name. Generates class names:
   * `{name}-enter-from`, `{name}-enter-active`, `{name}-enter-to`,
   * `{name}-leave-from`, `{name}-leave-active`, `{name}-leave-to`
   */
  name?: string;

  /** Override individual enter classes */
  enterFrom?: string;
  enterActive?: string;
  enterTo?: string;

  /** Override individual leave classes */
  leaveFrom?: string;
  leaveActive?: string;
  leaveTo?: string;

  /**
   * Fallback duration in ms. Used if transitionend/animationend
   * never fires (e.g., no CSS transition defined). Default: 300
   */
  duration?: number;

  /**
   * Whether to animate the initial render. Default: false
   */
  appear?: boolean;

  /**
   * Transition mode:
   * - 'out-in': old element leaves first, then new enters
   * - 'in-out': new element enters first, then old leaves
   * - undefined: both happen simultaneously (default)
   */
  mode?: 'out-in' | 'in-out';

  // --- JS hooks (called in addition to CSS classes) ---

  /** Called before enter starts. */
  onBeforeEnter?: (el: Element) => void;
  /** Called when enter starts. Call `done()` to signal completion. */
  onEnter?: (el: Element, done: () => void) => void;
  /** Called after enter completes. */
  onAfterEnter?: (el: Element) => void;

  /** Called before leave starts. el is still in the DOM. */
  onBeforeLeave?: (el: Element) => void;
  /** Called when leave starts. Call `done()` to signal completion. */
  onLeave?: (el: Element, done: () => void) => void;
  /** Called after leave completes. el has been removed. */
  onAfterLeave?: (el: Element) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Whether this options object has any animation configuration.
 */
function hasAnimation(opts: TransitionOptions): boolean {
  return !!(
    opts.name ||
    opts.enterFrom || opts.enterActive || opts.enterTo ||
    opts.leaveFrom || opts.leaveActive || opts.leaveTo ||
    opts.onEnter || opts.onLeave ||
    opts.onBeforeEnter || opts.onAfterEnter ||
    opts.onBeforeLeave || opts.onAfterLeave
  );
}

function resolveClasses(opts: TransitionOptions) {
  const name = opts.name ?? 'v';
  return {
    enterFrom: opts.enterFrom ?? `${name}-enter-from`,
    enterActive: opts.enterActive ?? `${name}-enter-active`,
    enterTo: opts.enterTo ?? `${name}-enter-to`,
    leaveFrom: opts.leaveFrom ?? `${name}-leave-from`,
    leaveActive: opts.leaveActive ?? `${name}-leave-active`,
    leaveTo: opts.leaveTo ?? `${name}-leave-to`,
  };
}

/**
 * Wait for a CSS transition or animation to end on an element.
 * Falls back to a timeout if no event fires.
 */
function whenTransitionEnds(
  el: Element,
  fallbackMs: number
): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      el.removeEventListener('transitionend', onEnd);
      el.removeEventListener('animationend', onEnd);
      resolve();
    };
    const onEnd = (e: Event) => {
      if (e.target === el) done();
    };
    el.addEventListener('transitionend', onEnd);
    el.addEventListener('animationend', onEnd);
    setTimeout(done, fallbackMs);
  });
}

/**
 * Force a browser reflow so that adding a class in the same frame
 * as removing another actually triggers a CSS transition.
 */
function forceReflow(el: Element): void {
  (el as HTMLElement).offsetHeight;
}

/**
 * Run the enter transition on an element.
 */
async function runEnter(
  el: Element,
  opts: TransitionOptions
): Promise<void> {
  const cls = resolveClasses(opts);
  const duration = opts.duration ?? 300;

  opts.onBeforeEnter?.(el);

  // 1. Apply enter-from + enter-active
  el.classList.add(cls.enterFrom, cls.enterActive);
  forceReflow(el);

  // 2. Swap enter-from → enter-to
  el.classList.remove(cls.enterFrom);
  el.classList.add(cls.enterTo);

  // 3. Wait for transition to finish
  if (opts.onEnter) {
    await new Promise<void>((resolve) => opts.onEnter!(el, resolve));
  } else {
    await whenTransitionEnds(el, duration);
  }

  // 4. Clean up classes
  el.classList.remove(cls.enterActive, cls.enterTo);

  opts.onAfterEnter?.(el);
}

/**
 * Run the leave transition on an element.
 */
async function runLeave(
  el: Element,
  opts: TransitionOptions
): Promise<void> {
  const cls = resolveClasses(opts);
  const duration = opts.duration ?? 300;

  opts.onBeforeLeave?.(el);

  // 1. Apply leave-from + leave-active
  el.classList.add(cls.leaveFrom, cls.leaveActive);
  forceReflow(el);

  // 2. Swap leave-from → leave-to
  el.classList.remove(cls.leaveFrom);
  el.classList.add(cls.leaveTo);

  // 3. Wait
  if (opts.onLeave) {
    await new Promise<void>((resolve) => opts.onLeave!(el, resolve));
  } else {
    await whenTransitionEnds(el, duration);
  }

  // 4. Clean up classes
  el.classList.remove(cls.leaveActive, cls.leaveTo);

  opts.onAfterLeave?.(el);
}

// ---------------------------------------------------------------------------
// transition() — animated show()
// ---------------------------------------------------------------------------

/**
 * Conditional rendering with enter/exit transitions.
 * Same signature as show() but with a transition options argument.
 *
 * Usage:
 *   transition(
 *     () => visible(),
 *     () => <Modal>Content</Modal>,
 *     () => <Placeholder />,
 *     { name: 'fade', duration: 300 }
 *   )
 *
 *   // Without fallback:
 *   transition(
 *     () => visible(),
 *     () => <Modal />,
 *     { name: 'fade' }
 *   )
 */
export function transition<T>(
  when: () => T | null | undefined | false | 0 | '',
  render: (value: NonNullable<T>) => Node,
  fallbackOrOpts?: (() => Node) | TransitionOptions,
  opts?: TransitionOptions
): Node {
  // Overload: transition(when, render, opts) or transition(when, render, fallback, opts)
  let fallback: (() => Node) | undefined;
  let options: TransitionOptions;

  if (typeof fallbackOrOpts === 'function') {
    fallback = fallbackOrOpts;
    options = opts ?? {};
  } else {
    fallback = undefined;
    options = fallbackOrOpts ?? {};
  }

  const animated = hasAnimation(options);

  let currentNode: Node = document.createComment('transition');
  let currentScope: Scope | null = null;
  let currentBranch: 'render' | 'fallback' | 'none' = 'none';
  let isFirstRender = true;
  let transitioning = false;

  renderEffect(() => {
    const value = when();
    const newBranch: 'render' | 'fallback' | 'none' = value
      ? 'render'
      : fallback
        ? 'fallback'
        : 'none';

    if (newBranch === currentBranch) return;
    if (transitioning) return;

    const oldNode = currentNode;
    const oldScope = currentScope;
    const isInitial = isFirstRender;
    isFirstRender = false;

    // Create the new node
    let newNode: Node;
    let newScope: Scope | null = null;

    if (value) {
      const scope = createScope(() => {
        newNode = render(value as NonNullable<T>);
      });
      newScope = scope;
    } else if (fallback) {
      const scope = createScope(() => {
        newNode = fallback!();
      });
      newScope = scope;
    } else {
      newNode = document.createComment('transition:empty');
    }

    const parent = oldNode.parentNode;

    // --- Not in DOM yet (initial setup before appendChild) ---
    if (!parent) {
      currentNode = newNode!;
      currentScope = newScope;
      currentBranch = newBranch;
      if (oldScope) oldScope.dispose();

      // Schedule appear animation after the node is in the DOM
      if (animated && isInitial && options.appear && newNode! instanceof Element) {
        queueMicrotask(() => {
          if (newNode!.isConnected) {
            runEnter(newNode! as Element, options);
          }
        });
      }
      return;
    }

    // --- No animation configured: swap synchronously (like show()) ---
    if (!animated) {
      parent.replaceChild(newNode!, oldNode);
      currentNode = newNode!;
      currentScope = newScope;
      currentBranch = newBranch;
      if (oldScope) oldScope.dispose();
      return;
    }

    // --- Animated swap ---
    currentNode = newNode!;
    currentScope = newScope;
    currentBranch = newBranch;
    transitioning = true;

    if (options.mode === 'out-in') {
      doOutIn(parent, oldNode, newNode!, oldScope, options).then(() => {
        transitioning = false;
      });
    } else if (options.mode === 'in-out') {
      doInOut(parent, oldNode, newNode!, oldScope, options).then(() => {
        transitioning = false;
      });
    } else {
      doSimultaneous(parent, oldNode, newNode!, oldScope, options).then(() => {
        transitioning = false;
      });
    }
  });

  return currentNode;
}

async function doOutIn(
  parent: Node, oldNode: Node, newNode: Node,
  oldScope: Scope | null, opts: TransitionOptions
): Promise<void> {
  if (oldNode instanceof Element) await runLeave(oldNode, opts);
  if (oldNode.parentNode) parent.replaceChild(newNode, oldNode);
  else parent.appendChild(newNode);
  if (oldScope) oldScope.dispose();
  if (newNode instanceof Element) await runEnter(newNode, opts);
}

async function doInOut(
  parent: Node, oldNode: Node, newNode: Node,
  oldScope: Scope | null, opts: TransitionOptions
): Promise<void> {
  parent.insertBefore(newNode, oldNode);
  if (newNode instanceof Element) await runEnter(newNode, opts);
  if (oldNode instanceof Element) await runLeave(oldNode, opts);
  if (oldNode.parentNode) parent.removeChild(oldNode);
  if (oldScope) oldScope.dispose();
}

async function doSimultaneous(
  parent: Node, oldNode: Node, newNode: Node,
  oldScope: Scope | null, opts: TransitionOptions
): Promise<void> {
  parent.insertBefore(newNode, oldNode);
  const enterP = newNode instanceof Element ? runEnter(newNode, opts) : Promise.resolve();
  const leaveP = oldNode instanceof Element ? runLeave(oldNode, opts) : Promise.resolve();
  await leaveP;
  if (oldNode.parentNode) parent.removeChild(oldNode);
  if (oldScope) oldScope.dispose();
  await enterP;
}

// ---------------------------------------------------------------------------
// transitionGroup() — animated each()
// ---------------------------------------------------------------------------

/**
 * List rendering with per-item enter/exit transitions.
 * Same signature as each() but with a transition options argument.
 *
 * Usage:
 *   transitionGroup(
 *     () => items(),
 *     (item) => <Card item={item} />,
 *     () => <EmptyState />,
 *     { key: (item) => item.id },
 *     { name: 'list', duration: 300 }
 *   )
 */
export function transitionGroup<T>(
  list: () => readonly T[],
  render: (item: T, index: () => number) => Node,
  fallback?: () => Node,
  listOptions?: { key?: (item: T) => unknown },
  transitionOpts?: TransitionOptions
): Node {
  const opts = transitionOpts ?? {};
  const animated = hasAnimation(opts);
  const container = document.createDocumentFragment();
  const marker = document.createComment('transition-group');
  container.appendChild(marker);

  type ItemEntry = {
    node: Node;
    scope: Scope;
    item: T;
  };

  let entries: ItemEntry[] = [];
  let fallbackEntry: { node: Node; scope: Scope } | null = null;
  let isFirstRender = true;
  const keyFn = listOptions?.key ?? ((item: T) => item);

  renderEffect(() => {
    const items = list();
    const parent = marker.parentNode;
    if (!parent) return;
    const shouldAnimate = animated && (!isFirstRender || !!opts.appear);

    // Remove fallback if it exists
    if (fallbackEntry) {
      if (shouldAnimate && fallbackEntry.node instanceof Element) {
        const fb = fallbackEntry;
        runLeave(fb.node as Element, opts).then(() => {
          if (fb.node.parentNode) fb.node.parentNode.removeChild(fb.node);
          fb.scope.dispose();
        });
      } else {
        if (fallbackEntry.node.parentNode) {
          fallbackEntry.node.parentNode.removeChild(fallbackEntry.node);
        }
        fallbackEntry.scope.dispose();
      }
      fallbackEntry = null;
    }

    if (items.length === 0 && fallback) {
      // Remove all items
      for (const entry of entries) {
        removeEntry(entry, shouldAnimate, opts);
      }
      entries = [];

      // Show fallback
      let fallbackNode: Node;
      const scope = createScope(() => {
        fallbackNode = fallback!();
      });
      parent.insertBefore(fallbackNode!, marker);
      fallbackEntry = { node: fallbackNode!, scope };

      if (shouldAnimate && fallbackNode! instanceof Element) {
        runEnter(fallbackNode! as Element, opts);
      }

      isFirstRender = false;
      return;
    }

    // Build a map of existing entries by key
    const oldMap = new Map<unknown, ItemEntry>();
    for (const entry of entries) {
      oldMap.set(keyFn(entry.item), entry);
    }

    // Build new entries, track which are newly created
    const newEntries: ItemEntry[] = [];
    const newKeys = new Set<unknown>();
    const brandNewNodes = new Set<Node>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = keyFn(item);

      if (__DEV__ && newKeys.has(key)) {
        console.warn(
          `[mikata] Duplicate key "${String(key)}" in transitionGroup(). ` +
          `Duplicate keys will cause rendering issues.`
        );
      }
      newKeys.add(key);

      const existing = oldMap.get(key);
      if (existing) {
        newEntries.push(existing);
        oldMap.delete(key);
      } else {
        let node: Node;
        const idx = i;
        const scope = createScope(() => {
          node = render(item, () => idx);
        });
        const entry = { node: node!, scope, item };
        newEntries.push(entry);
        brandNewNodes.add(node!);
      }
    }

    // Remove old entries
    for (const entry of oldMap.values()) {
      removeEntry(entry, shouldAnimate, opts);
    }

    // Reconcile position
    let nextRef: Node = marker;
    for (let i = newEntries.length - 1; i >= 0; i--) {
      const node = newEntries[i].node;
      if (node.nextSibling !== nextRef) {
        parent.insertBefore(node, nextRef);
      }
      nextRef = node;
    }

    // Enter-animate newly created nodes
    if (shouldAnimate) {
      for (const node of brandNewNodes) {
        if (node instanceof Element) {
          runEnter(node as Element, opts);
        }
      }
    }

    entries = newEntries;
    isFirstRender = false;
  });

  return container;
}

function removeEntry(
  entry: { node: Node; scope: Scope },
  animate: boolean,
  opts: TransitionOptions
): void {
  if (animate && entry.node instanceof Element) {
    runLeave(entry.node as Element, opts).then(() => {
      if (entry.node.parentNode) entry.node.parentNode.removeChild(entry.node);
      entry.scope.dispose();
    });
  } else {
    if (entry.node.parentNode) entry.node.parentNode.removeChild(entry.node);
    entry.scope.dispose();
  }
}
