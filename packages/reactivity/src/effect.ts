/**
 * Effect — reactive side effect that re-runs when dependencies change.
 *
 * One effect API to rule them all. The optional return value is a cleanup
 * function that runs before each re-execution and on disposal.
 *
 * renderEffect is the same but scheduled at higher priority (before paint).
 */

import {
  type ReactiveNode,
  cleanupSources,
  cleanupPropertySources,
  pushSubscriber,
  popSubscriber,
} from './tracking';
import { scheduleDirty, flushSync } from './scheduler';
import { getCurrentScope } from './scope';
import { registerNode, recordEffectRun, unregisterNode } from './debug';

declare const __DEV__: boolean;

interface EffectNode extends ReactiveNode {
  _cleanup: (() => void) | void;
  _fn: () => void | (() => void);
  _isRender: boolean;
  _sourceVersions: Map<ReactiveNode, number>;
}

function createEffectNode(
  fn: () => void | (() => void),
  isRender: boolean,
  label?: string
): () => void {
  const node: EffectNode = {
    _sources: new Set(),
    _subscribers: new Set(),
    _version: 0,
    _dirty: false,
    _cleanup: undefined,
    _fn: fn,
    _isRender: isRender,
    _sourceVersions: new Map(),

    _run() {
      const runStart = __DEV__ ? performance.now() : 0;
      // Before re-running, force-revalidate computed sources and check
      // if any source actually changed value. This prevents re-running
      // effects when a computed recomputes to the same value.
      // Skip this optimization when the effect has reactive proxy property
      // deps, since those aren't tracked in _sources/_sourceVersions.
      if (node._sourceVersions.size > 0 && !node._hasPropertyDeps) {
        // Force computeds to recompute
        for (const source of node._sources) {
          if (source._revalidate) {
            source._revalidate();
          }
        }
        // Check if any version actually changed
        let changed = false;
        for (const [source, version] of node._sourceVersions) {
          if (source._version !== version) {
            changed = true;
            break;
          }
        }
        if (!changed) return;
      }

      // Run cleanup from previous execution
      if (node._cleanup) {
        node._cleanup();
        node._cleanup = undefined;
      }

      // Clear old dependency tracking
      cleanupSources(node);
      cleanupPropertySources(node);
      node._hasPropertyDeps = false;

      // Execute and track new dependencies
      pushSubscriber(node);
      try {
        node._cleanup = node._fn();
      } finally {
        popSubscriber();
      }

      // Snapshot source versions for next dirty check
      node._sourceVersions = new Map();
      for (const source of node._sources) {
        node._sourceVersions.set(source, source._version);
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
      node._subscribers.clear();
    },
  };

  if (__DEV__) {
    registerNode(node, isRender ? 'renderEffect' : 'effect', label);
  }

  // Register with current scope for automatic disposal
  const scope = getCurrentScope();
  scope?.addChild(node);

  // Run immediately on creation
  node._run!();

  // Return dispose function
  return () => node._dispose();
}

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
