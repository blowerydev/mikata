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
 *
 * The node's own `_priority` (set when the effect was created) wins over
 * any passed priority - that's how renderEffect's `before-paint`
 * guarantee survives propagation through computeds and selectors, where
 * the intermediate caller doesn't know whether the leaf is a render or
 * user effect.
 */
export function scheduleDirty(
  node: ReactiveNode,
  priority: EffectPriority = 'user'
): void {
  if (!node._run) return; // Only schedule nodes with a run function (effects)
  if (node._dirty) return;

  node._dirty = true;
  pendingEffects.push({ node, priority: node._priority ?? priority });

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
    // Process all pending effects
    // New effects may be added during processing. Re-select the next
    // highest-priority item on every loop so transitive render effects
    // queued mid-flush still run before any pending user effects.
    const runCounts = __DEV__ ? new Map<ReactiveNode, number>() : null;
    let guard = 0;
    while (pendingEffects.length > 0) {
      if (++guard > 100000) {
        pendingEffects.length = 0;
        throw new Error(
          '[mikata] Circular reactive dependency detected. ' +
            'An effect is triggering itself during its own execution. ' +
            'Check for effects that write to signals they also read.'
        );
      }

      const { node } = takeNextScheduledEffect();
      if (node._dirty) {
        node._dirty = false;
        if (__DEV__ && runCounts) {
          const count = (runCounts.get(node) ?? 0) + 1;
          runCounts.set(node, count);
          if (count > 1000) {
            pendingEffects.length = 0;
            throw new Error(
              '[mikata] Circular reactive dependency detected. ' +
                'The same effect re-ran more than 1000 times in one flush. ' +
                'Check for effects that write to signals they also read.',
            );
          }
          if (count === 100) {
            console.warn(
              `[mikata] Unusually high number of re-runs (${count}) for the same effect in a single flush. ` +
              `This may indicate an effect that triggers itself. ` +
              `Check for effects that write to signals they also read.`,
            );
          }
        }
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

function takeNextScheduledEffect(): ScheduledEffect {
  let bestIdx = 0;
  let bestPriority = PRIORITY_ORDER[pendingEffects[0]!.priority];

  for (let i = 1; i < pendingEffects.length; i++) {
    const priority = PRIORITY_ORDER[pendingEffects[i]!.priority];
    if (priority < bestPriority) {
      bestIdx = i;
      bestPriority = priority;
    }
  }

  return pendingEffects.splice(bestIdx, 1)[0]!;
}
