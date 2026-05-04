/**
 * Effect - reactive side effect that re-runs when dependencies change.
 *
 * One effect API to rule them all. The optional return value is a cleanup
 * function that runs before each re-execution and on disposal.
 *
 * renderEffect is the same but scheduled at higher priority (before paint).
 */

import {
  type ReactiveNode,
  cleanupSources,
  cleanupStaleSources,
  cleanupPropertySources,
  clearSubscribers,
  beginDependencyTracking,
  pushSubscriber,
  popSubscriber,
} from './tracking';
import { scheduleDirty, flushSync } from './scheduler';
import { getCurrentScope, setCurrentScope, type Scope } from './scope';
import { registerNode, recordEffectRun, unregisterNode } from './debug';
import { beginLeakFrame, endLeakFrame } from './leak-detector';

declare const __DEV__: boolean;

interface EffectNode extends ReactiveNode {
  _cleanup: (() => void) | void;
  _fn: () => void | (() => void);
  _isRender: boolean;
  /**
   * Version snapshot used to skip effect re-runs when computed sources
   * revalidate to the same value. The one-source case is kept in scalar
   * fields because it is the hot path for DOM bindings and fanout effects;
   * multi-source effects lazily allocate the Map.
   */
  _singleSource?: ReactiveNode;
  _singleSourceVersion?: number;
  _sourceVersions?: Map<ReactiveNode, number>;
  _sources: NonNullable<ReactiveNode['_sources']>;
  /**
   * The scope that owned this effect at creation time. Restored for
   * every re-run so that `createScope()` / `onCleanup()` calls inside
   * the effect body see the same parent on re-runs as on the first
   * run. Without this, scheduler-triggered re-runs happen with a null
   * current scope (the scheduler has no ambient owner), which would
   * make child scopes orphans and break provide/inject across
   * dynamic subtrees (routeOutlet, show, each, etc.).
   */
  _owner: Scope | null;
}

function createEffectNode(
  fn: () => void | (() => void),
  isRender: boolean,
  label?: string
): () => void {
  const owner = getCurrentScope();
  const node: EffectNode = {
    _sources: [],
    _sourceSlots: [],
    _sourceMarks: [],
    _subscribers: [],
    _version: 0,
    _dirty: false,
    _cleanup: undefined,
    _fn: fn,
    _isRender: isRender,
    _priority: isRender ? 'render' : 'user',
    _owner: owner,

    _run() {
      const runStart = __DEV__ ? performance.now() : 0;
      // Before re-running, force-revalidate computed sources and check
      // if any source actually changed value. This prevents re-running
      // effects when a computed recomputes to the same value.
      // Skip this optimization when the effect has reactive proxy property
      // deps, since those aren't tracked in _sources/_sourceVersions.
      if (!node._hasPropertyDeps) {
        const singleSource = node._singleSource;
        const versions = node._sourceVersions;
        if (singleSource) {
          singleSource._revalidate?.();
          if (singleSource._version === node._singleSourceVersion) return;
        } else if (versions && versions.size > 0) {
          // Force computeds to recompute
          for (const source of node._sources) {
            if (source._revalidate) {
              source._revalidate();
            }
          }
          // Check if any version actually changed
          let changed = false;
          for (const [source, version] of versions) {
            if (source._version !== version) {
              changed = true;
              break;
            }
          }
          if (!changed) return;
        }
      }

      // Run cleanup from previous execution
      if (node._cleanup) {
        node._cleanup();
        node._cleanup = undefined;
      }

      // Mark dependencies read during this run, then sweep only stale links.
      // Stable DOM bindings keep their indexed edges instead of unlinking
      // and re-linking on every flush.
      const trackEpoch = beginDependencyTracking();
      cleanupPropertySources(node);
      node._hasPropertyDeps = false;

      // Execute and track new dependencies. Restore the owner scope so
      // createScope()/onCleanup()/provide() inside the effect body see
      // the same ambient scope on scheduler-driven re-runs as they did
      // on the first (synchronous) run.
      pushSubscriber(node, trackEpoch);
      const prevScope = setCurrentScope(node._owner);
      const leakFrame = __DEV__
        ? beginLeakFrame(isRender ? 'renderEffect' : 'effect', label)
        : null;
      try {
        node._cleanup = node._fn();
      } finally {
        setCurrentScope(prevScope);
        popSubscriber();
        cleanupStaleSources(node, trackEpoch);
        if (__DEV__) {
          endLeakFrame(leakFrame, node, typeof node._cleanup === 'function');
        }
      }

      // Snapshot source versions for next dirty check.
      if (node._sources.length === 1) {
        const source = node._sources[0]!;
        node._singleSource = source;
        node._singleSourceVersion = source._version;
      } else {
        node._singleSource = undefined;
        node._singleSourceVersion = undefined;
      }
      if (node._sources.length > 1) {
        const map = node._sourceVersions ?? (node._sourceVersions = new Map());
        if (map.size > 0) map.clear();
        for (const source of node._sources) {
          map.set(source, source._version);
        }
      } else if (node._sourceVersions && node._sourceVersions.size > 0) {
        node._sourceVersions.clear();
      }

      if (__DEV__) {
        recordEffectRun(node, performance.now() - runStart);
      }
    },

    _dispose() {
      unregisterNode(node);
      if (node._cleanup) {
        node._cleanup();
        node._cleanup = undefined;
      }
      cleanupSources(node);
      cleanupPropertySources(node);
      clearSubscribers(node);
    },
  };

  if (__DEV__) {
    registerNode(node, isRender ? 'renderEffect' : 'effect', label);
  }

  // Run immediately on creation.
  node._run!();

  // Auto-dispose renderEffects whose first run tracked no reactive sources
  // AND returned no cleanup function. Compiled output wraps every dynamic
  // JSX bit (`{row.id}`, `{user.name}`) in a renderEffect — many are static
  // in practice. A ReactiveNode that never re-fires is pure overhead;
  // reclaim it immediately. The cleanup guard preserves semantics for the
  // rare case where an effect registers teardown without tracking a source.
  if (
    isRender &&
    node._sources.length === 0 &&
    !node._hasPropertyDeps &&
    !node._cleanup
  ) {
    if (__DEV__) unregisterNode(node);
    return NO_OP_DISPOSE;
  }

  // Register with current scope for automatic disposal.
  getCurrentScope()?.addChild(node);

  // Return dispose function
  return () => node._dispose();
}

const NO_OP_DISPOSE = (): void => {};

/**
 * Create a reactive effect. Re-runs whenever any signal/reactive
 * value read inside `fn` changes.
 *
 * The optional return value of `fn` is a cleanup function that runs
 * before each re-execution and when the effect is disposed.
 *
 * @returns A dispose function to manually stop the effect.
 */
export function effect(fn: () => void | (() => void), label?: string): () => void {
  return createEffectNode(fn, false, label);
}

/**
 * Like effect(), but scheduled at render priority (runs before user effects).
 * Used internally by the compiler for DOM-updating effects.
 */
export function renderEffect(fn: () => void | (() => void), label?: string): () => void {
  return createEffectNode(fn, true, label);
}
