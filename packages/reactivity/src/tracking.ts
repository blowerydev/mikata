/**
 * Core dependency tracking system.
 *
 * Uses a subscriber stack to track which reactive nodes are read during
 * which computations. This is the shared foundation for both signals and
 * reactive proxies.
 */

export interface ReactiveNode {
  /** Nodes this depends on */
  _sources: Set<ReactiveNode>;
  /** Nodes that depend on this */
  _subscribers: Set<ReactiveNode>;
  /** Incremented on each value change */
  _version: number;
  /** Whether this node needs re-evaluation */
  _dirty: boolean;
  /** Run the node's computation (effects/computeds) */
  _run?(): void;
  /** Mark this node as dirty and propagate */
  _markDirty?(): void;
  /** Force recomputation if dirty (computeds only). Returns true if value changed. */
  _revalidate?(): boolean;
  /** Whether this node has reactive proxy property deps (not in _sources) */
  _hasPropertyDeps?: boolean;
  /** Clean up this node */
  _dispose(): void;
}

declare const __DEV__: boolean;

let currentSubscriber: ReactiveNode | null = null;
const subscriberStack: (ReactiveNode | null)[] = [];

/**
 * Whether we're currently inside a computed evaluation.
 * Used in dev mode to warn about signal writes inside computed.
 */
let _insideComputed = false;

export function isInsideComputed(): boolean {
  return _insideComputed;
}

export function setInsideComputed(value: boolean): void {
  _insideComputed = value;
}

export function getCurrentSubscriber(): ReactiveNode | null {
  return currentSubscriber;
}

export function pushSubscriber(sub: ReactiveNode | null): void {
  subscriberStack.push(currentSubscriber);
  currentSubscriber = sub;
}

export function popSubscriber(): void {
  currentSubscriber = subscriberStack.pop() ?? null;
}

/**
 * Subscribe the current subscriber to a source node.
 * Called when a reactive value is read.
 */
export function track(source: ReactiveNode): void {
  if (currentSubscriber) {
    source._subscribers.add(currentSubscriber);
    currentSubscriber._sources.add(source);
  }
}

/**
 * Remove all source->subscriber links for a node.
 * Called before re-running a computation so stale dependencies are dropped.
 */
export function cleanupSources(node: ReactiveNode): void {
  for (const source of node._sources) {
    source._subscribers.delete(node);
  }
  node._sources.clear();
}

/**
 * Property-level tracking for reactive proxies.
 * Maps target object -> property key -> set of subscriber nodes.
 */
const targetMap = new WeakMap<object, Map<PropertyKey, Set<ReactiveNode>>>();

export function trackProperty(target: object, key: PropertyKey): void {
  if (!currentSubscriber) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let deps = depsMap.get(key);
  if (!deps) {
    deps = new Set();
    depsMap.set(key, deps);
  }
  deps.add(currentSubscriber);
  currentSubscriber._hasPropertyDeps = true;
}

export function getPropertySubscribers(
  target: object,
  key: PropertyKey
): Set<ReactiveNode> | undefined {
  return targetMap.get(target)?.get(key);
}
