/**
 * Dev-mode debug registry for reactive nodes.
 *
 * Tracks all signals, computeds, and effects with metadata so that
 * devtools can inspect the live dependency graph. All tracking is
 * no-op in production (guarded by __DEV__).
 */

import type { ReactiveNode } from './tracking';
import { getCurrentScope, type Scope } from './scope';

declare const __DEV__: boolean;

// ---------------------------------------------------------------------------
// Node metadata
// ---------------------------------------------------------------------------

export type NodeKind = 'signal' | 'computed' | 'effect' | 'renderEffect';

export interface DebugNodeInfo {
  /** Unique numeric ID */
  id: number;
  /** What kind of reactive node */
  kind: NodeKind;
  /** Optional human-readable label */
  label: string | undefined;
  /** The underlying ReactiveNode */
  node: ReactiveNode;
  /** Stack trace at creation (truncated to first 5 frames) */
  createdAt: string;
  /** Read current value (signals/computeds only) */
  getValue?: () => unknown;
  /** The reactive scope active when this node was created (used to attribute to a component) */
  scope?: Scope;
  /** Last `_version` we observed - used to derive updateCount/lastChangedAt lazily at snapshot time. */
  lastSeenVersion: number;
  /** Number of times the node's version has changed since registration. */
  updateCount: number;
  /** Timestamp of the most recent observed change (performance.now()). 0 if never changed. */
  lastChangedAt: number;
  /** For effects: duration of the last run, in ms. Undefined if never run. */
  lastRunMs?: number;
  /** For effects: cumulative runtime, in ms. */
  totalRunMs: number;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

let nextId = 1;
const nodeRegistry = new Map<ReactiveNode, DebugNodeInfo>();

/**
 * Register a reactive node for devtools inspection.
 */
export function registerNode(
  node: ReactiveNode,
  kind: NodeKind,
  label?: string,
  getValue?: () => unknown
): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;

  const stack = new Error().stack ?? '';
  // Skip first 2 lines (Error + registerNode), keep next 5
  const frames = stack.split('\n').slice(2, 7).join('\n');

  nodeRegistry.set(node, {
    id: nextId++,
    kind,
    label,
    node,
    createdAt: frames,
    getValue,
    scope: getCurrentScope() ?? undefined,
    lastSeenVersion: node._version,
    updateCount: 0,
    lastChangedAt: 0,
    totalRunMs: 0,
  });
}

/**
 * Record the duration of an effect run. Called by effect._run in dev mode.
 */
export function recordEffectRun(node: ReactiveNode, durationMs: number): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
  const info = nodeRegistry.get(node);
  if (!info) return;
  info.lastRunMs = durationMs;
  info.totalRunMs += durationMs;
}

/**
 * Unregister a node when it's disposed.
 */
export function unregisterNode(node: ReactiveNode): void {
  nodeRegistry.delete(node);
}

/**
 * Get debug info for a specific node.
 */
export function getNodeInfo(node: ReactiveNode): DebugNodeInfo | undefined {
  return nodeRegistry.get(node);
}

// ---------------------------------------------------------------------------
// Query API (exposed via window.__MIKATA_DEVTOOLS__)
// ---------------------------------------------------------------------------

export interface ReactiveGraphSnapshot {
  signals: DebugNodeSnapshot[];
  computeds: DebugNodeSnapshot[];
  effects: DebugNodeSnapshot[];
  renderEffects: DebugNodeSnapshot[];
}

export interface DebugNodeSnapshot {
  id: number;
  kind: NodeKind;
  label: string | undefined;
  value?: unknown;
  dirty: boolean;
  version: number;
  sourceCount: number;
  subscriberCount: number;
  sources: number[];
  subscribers: number[];
  createdAt: string;
  /**
   * Closest labeled scope ancestor (typically the owning component). Lets
   * devtools show "in <Button />" next to each signal/effect.
   */
  owner?: { scopeId: number; label: string };
  /** Number of times this node's value/version has changed since creation. */
  updateCount: number;
  /** performance.now() of most recent change - 0 if never changed. */
  lastChangedAt: number;
  /** For effects: last run duration in ms. */
  lastRunMs?: number;
  /** For effects: cumulative run time in ms. */
  totalRunMs?: number;
}

function snapshotNode(info: DebugNodeInfo): DebugNodeSnapshot {
  const { node } = info;
  // Lazy change tracking: compare version since last snapshot.
  if (node._version !== info.lastSeenVersion) {
    info.lastSeenVersion = node._version;
    info.updateCount++;
    info.lastChangedAt = performance.now();
  }
  return {
    id: info.id,
    kind: info.kind,
    label: info.label,
    value: info.getValue ? safeGetValue(info.getValue) : undefined,
    dirty: node._dirty,
    version: node._version,
    sourceCount: node._sources.size,
    subscriberCount: node._subscribers.size,
    sources: [...node._sources]
      .map((s) => nodeRegistry.get(s)?.id)
      .filter((id): id is number => id !== undefined),
    subscribers: [...node._subscribers]
      .map((s) => nodeRegistry.get(s)?.id)
      .filter((id): id is number => id !== undefined),
    createdAt: info.createdAt,
    owner: findLabeledScope(info.scope),
    updateCount: info.updateCount,
    lastChangedAt: info.lastChangedAt,
    lastRunMs: info.lastRunMs,
    totalRunMs: info.totalRunMs || undefined,
  };
}

function findLabeledScope(scope: Scope | undefined): { scopeId: number; label: string } | undefined {
  let cur: Scope | null | undefined = scope;
  while (cur) {
    if (cur.label) return { scopeId: cur.id, label: cur.label };
    cur = cur.parent;
  }
  return undefined;
}

function safeGetValue(fn: () => unknown): unknown {
  try {
    return fn();
  } catch {
    return '<error reading value>';
  }
}

/**
 * Take a snapshot of the entire reactive graph.
 */
export function getGraphSnapshot(): ReactiveGraphSnapshot {
  const signals: DebugNodeSnapshot[] = [];
  const computeds: DebugNodeSnapshot[] = [];
  const effects: DebugNodeSnapshot[] = [];
  const renderEffects: DebugNodeSnapshot[] = [];

  for (const info of nodeRegistry.values()) {
    const snapshot = snapshotNode(info);
    switch (info.kind) {
      case 'signal':
        signals.push(snapshot);
        break;
      case 'computed':
        computeds.push(snapshot);
        break;
      case 'effect':
        effects.push(snapshot);
        break;
      case 'renderEffect':
        renderEffects.push(snapshot);
        break;
    }
  }

  return { signals, computeds, effects, renderEffects };
}

/**
 * Find a node by its ID.
 */
export function findNodeById(id: number): DebugNodeSnapshot | undefined {
  for (const info of nodeRegistry.values()) {
    if (info.id === id) return snapshotNode(info);
  }
  return undefined;
}

/**
 * Get the full dependency chain for a node: what does it depend on, transitively?
 */
export function traceDependencies(id: number): DebugNodeSnapshot[] {
  const visited = new Set<number>();
  const result: DebugNodeSnapshot[] = [];

  function walk(nodeId: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    for (const info of nodeRegistry.values()) {
      if (info.id === nodeId) {
        const snap = snapshotNode(info);
        result.push(snap);
        for (const srcId of snap.sources) {
          walk(srcId);
        }
        break;
      }
    }
  }

  walk(id);
  return result;
}

/**
 * Get the full subscriber chain: what depends on this node, transitively?
 */
export function traceSubscribers(id: number): DebugNodeSnapshot[] {
  const visited = new Set<number>();
  const result: DebugNodeSnapshot[] = [];

  function walk(nodeId: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    for (const info of nodeRegistry.values()) {
      if (info.id === nodeId) {
        const snap = snapshotNode(info);
        result.push(snap);
        for (const subId of snap.subscribers) {
          walk(subId);
        }
        break;
      }
    }
  }

  walk(id);
  return result;
}

/**
 * Get counts summary for quick overview.
 */
export function getStats(): {
  signals: number;
  computeds: number;
  effects: number;
  renderEffects: number;
  total: number;
  dirty: number;
} {
  let signals = 0,
    computeds = 0,
    effects = 0,
    renderEffects = 0,
    dirty = 0;

  for (const info of nodeRegistry.values()) {
    switch (info.kind) {
      case 'signal':
        signals++;
        break;
      case 'computed':
        computeds++;
        break;
      case 'effect':
        effects++;
        break;
      case 'renderEffect':
        renderEffects++;
        break;
    }
    if (info.node._dirty) dirty++;
  }

  return {
    signals,
    computeds,
    effects,
    renderEffects,
    total: signals + computeds + effects + renderEffects,
    dirty,
  };
}

/**
 * Get all nodes of a specific kind.
 */
export function getNodesByKind(kind: NodeKind): DebugNodeSnapshot[] {
  const result: DebugNodeSnapshot[] = [];
  for (const info of nodeRegistry.values()) {
    if (info.kind === kind) {
      result.push(snapshotNode(info));
    }
  }
  return result;
}

/**
 * Find nodes by label (substring match, case-insensitive).
 */
export function findNodesByLabel(query: string): DebugNodeSnapshot[] {
  const lower = query.toLowerCase();
  const result: DebugNodeSnapshot[] = [];
  for (const info of nodeRegistry.values()) {
    if (info.label && info.label.toLowerCase().includes(lower)) {
      result.push(snapshotNode(info));
    }
  }
  return result;
}

/**
 * Reset the registry. Used in tests.
 */
export function _resetDebugRegistry(): void {
  nodeRegistry.clear();
  nextId = 1;
}
