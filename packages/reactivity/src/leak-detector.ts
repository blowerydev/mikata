/**
 * Dev-mode detection of forgotten subscription cleanups.
 *
 * When an `effect()` / `renderEffect()` callback calls
 * `addEventListener`, `setInterval`, or `setTimeout` but does NOT return a
 * cleanup function AND does NOT call `onCleanup(...)` during the run, we
 * log a warning. The subscription will live past the effect's lifetime —
 * the classic Mikata leak.
 *
 * Enabled only under `__DEV__`. The global patches are installed lazily on
 * first effect run, so production bundles have zero cost (the installer is
 * gated on `__DEV__`).
 */

declare const __DEV__: boolean;

interface LeakFrame {
  label: string | undefined;
  kind: 'effect' | 'renderEffect';
  addListenerCount: number;
  setIntervalCount: number;
  setTimeoutCount: number;
  onCleanupCalled: boolean;
}

/** Stack of currently-running effect invocations being observed. */
const frameStack: LeakFrame[] = [];
let patched = false;
let reported = new WeakSet<object>();

/**
 * Warnings are deduplicated per effect node so a repeatedly-firing effect
 * only warns once. The node object is used as the weakmap key (passed
 * through `beginLeakFrame`).
 */
export function resetLeakReports(): void {
  reported = new WeakSet();
}

function installPatches(): void {
  if (patched) return;
  patched = true;

  if (typeof EventTarget !== 'undefined') {
    const origAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (this: EventTarget, ...args: Parameters<EventTarget['addEventListener']>): void {
      const top = frameStack[frameStack.length - 1];
      if (top) top.addListenerCount++;
      return origAdd.apply(this, args);
    } as EventTarget['addEventListener'];
  }

  const g = globalThis as typeof globalThis & {
    setInterval: typeof setInterval;
    setTimeout: typeof setTimeout;
  };

  const origSetInterval = g.setInterval;
  g.setInterval = function (...args: Parameters<typeof setInterval>): ReturnType<typeof setInterval> {
    const top = frameStack[frameStack.length - 1];
    if (top) top.setIntervalCount++;
    return origSetInterval.apply(this as unknown as typeof globalThis, args);
  } as typeof setInterval;

  const origSetTimeout = g.setTimeout;
  g.setTimeout = function (...args: Parameters<typeof setTimeout>): ReturnType<typeof setTimeout> {
    const top = frameStack[frameStack.length - 1];
    if (top) top.setTimeoutCount++;
    return origSetTimeout.apply(this as unknown as typeof globalThis, args);
  } as typeof setTimeout;
}

/**
 * Called by the effect runner before invoking the user callback.
 * Returns a frame that must be passed back to `endLeakFrame`.
 */
export function beginLeakFrame(kind: 'effect' | 'renderEffect', label: string | undefined): LeakFrame | null {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return null;
  installPatches();
  const frame: LeakFrame = {
    label,
    kind,
    addListenerCount: 0,
    setIntervalCount: 0,
    setTimeoutCount: 0,
    onCleanupCalled: false,
  };
  frameStack.push(frame);
  return frame;
}

/**
 * Called by the effect runner after the user callback returns.
 * `nodeKey` identifies the effect so repeated fires of the same leaky
 * effect don't spam the console.
 */
export function endLeakFrame(
  frame: LeakFrame | null,
  nodeKey: object,
  hasReturnedCleanup: boolean,
): void {
  if (!frame) return;
  const popped = frameStack.pop();
  if (popped !== frame) {
    // Mismatched stack — swallow, something above us unwound oddly.
    return;
  }
  if (hasReturnedCleanup || frame.onCleanupCalled) return;

  const subs =
    frame.addListenerCount + frame.setIntervalCount + frame.setTimeoutCount;
  if (subs === 0) return;
  if (reported.has(nodeKey)) return;
  reported.add(nodeKey);

  const parts: string[] = [];
  if (frame.addListenerCount) parts.push(`${frame.addListenerCount}× addEventListener`);
  if (frame.setIntervalCount) parts.push(`${frame.setIntervalCount}× setInterval`);
  if (frame.setTimeoutCount) parts.push(`${frame.setTimeoutCount}× setTimeout`);
  const who = frame.label ? `\`${frame.label}\`` : `(unlabeled ${frame.kind})`;

  // eslint-disable-next-line no-console
  console.warn(
    `[mikata] Possible subscription leak in ${frame.kind} ${who}: ${parts.join(', ')} without teardown. ` +
      `Return a cleanup function, call onCleanup(), or use use${'EventListener'}/useInterval/useTimeout helpers.`,
  );
}

/** Called by `onCleanup()` so the current frame knows cleanup was registered. */
export function notifyOnCleanupCalled(): void {
  const top = frameStack[frameStack.length - 1];
  if (top) top.onCleanupCalled = true;
}
