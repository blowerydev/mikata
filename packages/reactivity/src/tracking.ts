/**
 * Core dependency tracking system.
 *
 * Uses a subscriber stack to track which reactive nodes are read during
 * which computations. This is the shared foundation for both signals and
 * reactive proxies.
 */

export interface ReactiveNode {
  /**
   * Sources this node depends on. Optional: signal/selector-bucket nodes are
   * sources only, never subscribers, so allocating an empty array per
   * instance is pure overhead. Effect/computed nodes always allocate it.
   */
  _sources?: ReactiveNode[];
  /** Parallel slot indexes into each source's `_subscribers` array. */
  _sourceSlots?: number[];
  /** Parallel tracking epochs for mark/sweep dependency cleanup. */
  _sourceMarks?: number[];
  /** Nodes that depend on this */
  _subscribers: ReactiveNode[];
  /** Parallel slot indexes into each subscriber's `_sources` array. */
  _subscriberSlots?: number[];
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
  /**
   * Scheduling priority. Render effects ('render') flush before user
   * effects ('user') in the same tick. Plain signals/computeds don't
   * carry a priority - it only matters at the leaf (the effect) where
   * scheduleDirty is called.
   */
  _priority?: 'render' | 'user';
  /** Clean up this node */
  _dispose(): void;
}

declare const __DEV__: boolean;

let currentSubscriber: ReactiveNode | null = null;
let currentTrackEpoch = 0;
let nextTrackEpoch = 1;
const subscriberStack: Array<{
  subscriber: ReactiveNode | null;
  trackEpoch: number;
}> = [];

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

export function pushSubscriber(sub: ReactiveNode | null, trackEpoch = 0): void {
  subscriberStack.push({
    subscriber: currentSubscriber,
    trackEpoch: currentTrackEpoch,
  });
  currentSubscriber = sub;
  currentTrackEpoch = trackEpoch;
}

export function popSubscriber(): void {
  const prev = subscriberStack.pop();
  currentSubscriber = prev?.subscriber ?? null;
  currentTrackEpoch = prev?.trackEpoch ?? 0;
}

/**
 * Subscribe the current subscriber to a source node.
 * Called when a reactive value is read.
 */
export function track(source: ReactiveNode): void {
  if (currentSubscriber) {
    subscribe(source, currentSubscriber);
  }
}

export function subscribe(source: ReactiveNode, subscriber: ReactiveNode): void {
  const sources = subscriber._sources!;
  const sourceMarks = subscriber._sourceMarks ?? (subscriber._sourceMarks = []);
  for (let i = 0; i < sources.length; i++) {
    if (sources[i] === source) {
      sourceMarks[i] = currentTrackEpoch;
      return;
    }
  }

  const sourceSlots = subscriber._sourceSlots ?? (subscriber._sourceSlots = []);
  const subscriberSlots = source._subscriberSlots ?? (source._subscriberSlots = []);
  const sourceIndex = source._subscribers.length;
  const subscriberIndex = sources.length;

  source._subscribers.push(subscriber);
  subscriberSlots.push(subscriberIndex);
  sources.push(source);
  sourceSlots.push(sourceIndex);
  sourceMarks.push(currentTrackEpoch);
}

export function beginDependencyTracking(): number {
  return nextTrackEpoch++;
}

export function cleanupStaleSources(node: ReactiveNode, trackEpoch: number): void {
  const sources = node._sources;
  const sourceMarks = node._sourceMarks;
  if (!sources || !sourceMarks) return;
  for (let i = sources.length - 1; i >= 0; i--) {
    if (sourceMarks[i] !== trackEpoch) removeSourceAt(node, i);
  }
}

/**
 * Remove all source->subscriber links for a node.
 * Called before re-running a computation so stale dependencies are dropped.
 */
export function cleanupSources(node: ReactiveNode): void {
  const sources = node._sources;
  if (!sources) return;
  for (let i = sources.length - 1; i >= 0; i--) {
    removeSourceAt(node, i);
  }
}

export function clearSubscribers(node: ReactiveNode): void {
  const subscribers = node._subscribers;
  const subscriberSlots = node._subscriberSlots;
  if (subscriberSlots) {
    for (let i = 0; i < subscribers.length; i++) {
      const subscriber = subscribers[i]!;
      const sources = subscriber._sources;
      const sourceSlots = subscriber._sourceSlots;
      if (!sources || !sourceSlots) continue;
      const lastIndex = sources.length - 1;
      const index = subscriberSlots[i]!;
      if (index >= 0 && index <= lastIndex) {
        if (index !== lastIndex) {
          const movedSource = sources[lastIndex]!;
          const movedSourceSlot = sourceSlots[lastIndex]!;
          const movedMark = subscriber._sourceMarks?.[lastIndex];
          sources[index] = movedSource;
          sourceSlots[index] = movedSourceSlot;
          if (subscriber._sourceMarks && movedMark !== undefined) {
            subscriber._sourceMarks[index] = movedMark;
          }
          movedSource._subscriberSlots![movedSourceSlot] = index;
        }
        sources.pop();
        sourceSlots.pop();
        subscriber._sourceMarks?.pop();
      }
    }
    subscriberSlots.length = 0;
  }
  subscribers.length = 0;
}

function removeSourceAt(node: ReactiveNode, sourceListIndex: number): void {
  const sources = node._sources!;
  const sourceSlots = node._sourceSlots!;
  const sourceMarks = node._sourceMarks;
  const source = sources[sourceListIndex]!;
  const subscriberSlots = source._subscriberSlots;
  const sourceSubscriberIndex = sourceSlots[sourceListIndex]!;
  const lastSubscriberIndex = source._subscribers.length - 1;

  if (sourceSubscriberIndex >= 0 && sourceSubscriberIndex <= lastSubscriberIndex) {
    if (sourceSubscriberIndex !== lastSubscriberIndex) {
      const movedSubscriber = source._subscribers[lastSubscriberIndex]!;
      const movedSubscriberSlot = subscriberSlots?.[lastSubscriberIndex];
      source._subscribers[sourceSubscriberIndex] = movedSubscriber;
      if (subscriberSlots && movedSubscriberSlot !== undefined) {
        subscriberSlots[sourceSubscriberIndex] = movedSubscriberSlot;
        movedSubscriber._sourceSlots![movedSubscriberSlot] = sourceSubscriberIndex;
      }
    }
    source._subscribers.pop();
    subscriberSlots?.pop();
  }

  const lastSourceListIndex = sources.length - 1;
  if (sourceListIndex !== lastSourceListIndex) {
    const movedSource = sources[lastSourceListIndex]!;
    const movedSourceSlot = sourceSlots[lastSourceListIndex]!;
    const movedMark = sourceMarks?.[lastSourceListIndex];
    sources[sourceListIndex] = movedSource;
    sourceSlots[sourceListIndex] = movedSourceSlot;
    if (sourceMarks && movedMark !== undefined) {
      sourceMarks[sourceListIndex] = movedMark;
    }
    movedSource._subscriberSlots![movedSourceSlot] = sourceListIndex;
  }
  sources.pop();
  sourceSlots.pop();
  sourceMarks?.pop();
}

/**
 * Property-level tracking for reactive proxies.
 * Maps target object -> property key -> set of subscriber nodes.
 */
const targetMap = new WeakMap<object, Map<PropertyKey, Set<ReactiveNode>>>();

/**
 * Reverse map: node -> list of (target, key) pairs it subscribes to.
 * Used by cleanupPropertySources to remove stale subscriptions.
 */
const nodePropertyDeps = new WeakMap<ReactiveNode, Array<{ target: object; key: PropertyKey }>>();

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

  // Track reverse mapping for cleanup
  let propDeps = nodePropertyDeps.get(currentSubscriber);
  if (!propDeps) {
    propDeps = [];
    nodePropertyDeps.set(currentSubscriber, propDeps);
  }
  propDeps.push({ target, key });
}

/**
 * Remove all property-level subscriptions for a node.
 * Called before re-running an effect so stale property deps are dropped.
 */
export function cleanupPropertySources(node: ReactiveNode): void {
  const propDeps = nodePropertyDeps.get(node);
  if (!propDeps) return;

  for (const { target, key } of propDeps) {
    const depsMap = targetMap.get(target);
    if (depsMap) {
      const deps = depsMap.get(key);
      if (deps) {
        deps.delete(node);
        if (deps.size === 0) depsMap.delete(key);
      }
      if (depsMap.size === 0) targetMap.delete(target);
    }
  }
  propDeps.length = 0;
}

export function getPropertySubscribers(
  target: object,
  key: PropertyKey
): Set<ReactiveNode> | undefined {
  return targetMap.get(target)?.get(key);
}
