/**
 * Unified scheduler for reactive effects.
 *
 * Handles batching, priority ordering, and microtask-based flushing.
 * Both signals and reactive proxies notify through this scheduler.
 */

import type { ReactiveNode } from './tracking';

declare const __DEV__: boolean;

export type EffectPriority = 'render' | 'user';

interface ScheduledEffect {
  node: ReactiveNode;
  priority: EffectPriority;
}

const pendingEffects: ScheduledEffect[] = [];
let isFlushing = false;
let batchDepth = 0;

const PRIORITY_ORDER: Record<EffectPriority, number> = {
  render: 0,
  user: 1,
};

/**
 * Schedule a dirty node for re-execution.
 * If not currently batching or flushing, queues a microtask to flush.
 */
export function scheduleDirty(
  node: ReactiveNode,
  priority: EffectPriority = 'user'
): void {
  if (!node._run) return; // Only schedule nodes with a run function (effects)

  node._dirty = true;
  pendingEffects.push({ node, priority });

  if (!isFlushing && batchDepth === 0) {
    queueMicrotask(flush);
  }
}

/**
 * Flush all pending effects in priority order.
 * Render-priority effects run first (DOM updates), then user effects.
 */
function flush(): void {
  if (isFlushing) return;
  isFlushing = true;

  try {
    // Sort by priority
    pendingEffects.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );

    // Process all pending effects
    // New effects may be added during processing (they'll be appended)
    let guard = 0;
    while (pendingEffects.length > 0) {
      if (++guard > 1000) {
        pendingEffects.length = 0;
        throw new Error(
          '[mikata] Circular reactive dependency detected. ' +
            'An effect is triggering itself during its own execution. ' +
            'Check for effects that write to signals they also read.'
        );
      }
      if (__DEV__ && guard === 100) {
        console.warn(
          `[mikata] Unusually high number of effect re-runs (${guard}) in a single flush. ` +
          `This may indicate an effect that triggers itself. ` +
          `Check for effects that write to signals they also read.`
        );
      }

      const { node } = pendingEffects.shift()!;
      if (node._dirty) {
        node._dirty = false;
        node._run?.();
      }
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Batch multiple mutations together. Effects are deferred until
 * the outermost batch completes.
 *
 * Note: mutations in the same synchronous block are already auto-batched
 * via microtask scheduling. Use batch() when you need explicit control
 * or are mixing sync and async mutations.
 */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      queueMicrotask(flush);
    }
  }
}

/**
 * Synchronously flush all pending effects. Used internally by
 * renderEffect to ensure DOM updates happen before paint.
 */
export function flushSync(): void {
  flush();
}
