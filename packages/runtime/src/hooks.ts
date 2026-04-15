/**
 * Scope-bound subscription helpers.
 *
 * Each helper registers a subscription AND its teardown with the active
 * reactive scope via `onCleanup`. This removes the #1 class of leaks in
 * Mikata code: forgetting to remove an event listener / timer / observer
 * when the owning component or effect disposes.
 *
 * Safe to call in a component body, an `effect()`, or inside another hook.
 * The teardown runs exactly once when the owning scope is disposed.
 */

import { onCleanup } from '@mikata/reactivity';

// ---------------------------------------------------------------------------
// useEventListener
// ---------------------------------------------------------------------------

type EventTargetLike = EventTarget;

/**
 * Attach a DOM event listener and auto-remove it when the current scope
 * disposes.
 *
 * ```tsx
 * function ScrollTracker() {
 *   const [y, setY] = signal(0);
 *   useEventListener(window, 'scroll', () => setY(window.scrollY));
 *   return <div>y = {y()}</div>;
 * }
 * ```
 */
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  handler: (this: Window, ev: WindowEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions
): void;
export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  handler: (this: Document, ev: DocumentEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions
): void;
export function useEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions
): void;
export function useEventListener(
  target: EventTargetLike,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): void;
export function useEventListener(
  target: EventTargetLike,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): void {
  target.addEventListener(type, handler, options);
  onCleanup(() => target.removeEventListener(type, handler, options));
}

// ---------------------------------------------------------------------------
// useInterval / useTimeout
// ---------------------------------------------------------------------------

/**
 * Run `fn` every `ms` milliseconds. The timer is cleared when the current
 * scope disposes.
 */
export function useInterval(fn: () => void, ms: number): number {
  const id = setInterval(fn, ms) as unknown as number;
  onCleanup(() => clearInterval(id));
  return id;
}

/**
 * Run `fn` after `ms` milliseconds. The timer is cleared if the scope
 * disposes first (so pending callbacks never fire against a torn-down
 * component).
 */
export function useTimeout(fn: () => void, ms: number): number {
  const id = setTimeout(fn, ms) as unknown as number;
  onCleanup(() => clearTimeout(id));
  return id;
}

// ---------------------------------------------------------------------------
// useSubscription - generic .on()/.off() bridge
// ---------------------------------------------------------------------------

/**
 * Subscribe to any emitter-style API and auto-unsubscribe on scope dispose.
 *
 * The `subscribe` callback receives no arguments and must return an
 * unsubscribe function. This is the same shape React's useSyncExternalStore
 * uses and most event libraries (RxJS, nanostores, TipTap transactions,
 * socket.io, etc.) expose or can be adapted to.
 *
 * ```tsx
 * useSubscription(() => {
 *   editor.on('transaction', onTx);
 *   return () => editor.off('transaction', onTx);
 * });
 * ```
 */
export function useSubscription(subscribe: () => () => void): void {
  const unsubscribe = subscribe();
  onCleanup(unsubscribe);
}

// ---------------------------------------------------------------------------
// Observers
// ---------------------------------------------------------------------------

/**
 * Observe a DOM element's size. The observer is disconnected on scope
 * dispose. Pass a function for `target` if the element is created later
 * (e.g., inside an onMount) — it's only read once, at registration time.
 */
export function useResizeObserver(
  target: Element | (() => Element | null | undefined),
  callback: ResizeObserverCallback,
  options?: ResizeObserverOptions
): ResizeObserver {
  const observer = new ResizeObserver(callback);
  const el = typeof target === 'function' ? target() : target;
  if (el) observer.observe(el, options);
  onCleanup(() => observer.disconnect());
  return observer;
}

/**
 * Observe DOM mutations on a subtree. The observer is disconnected on
 * scope dispose.
 */
export function useMutationObserver(
  target: Node | (() => Node | null | undefined),
  callback: MutationCallback,
  options?: MutationObserverInit
): MutationObserver {
  const observer = new MutationObserver(callback);
  const el = typeof target === 'function' ? target() : target;
  if (el) observer.observe(el, options);
  onCleanup(() => observer.disconnect());
  return observer;
}

/**
 * Observe element visibility. The observer is disconnected on scope
 * dispose.
 */
export function useIntersectionObserver(
  target: Element | (() => Element | null | undefined),
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const observer = new IntersectionObserver(callback, options);
  const el = typeof target === 'function' ? target() : target;
  if (el) observer.observe(el);
  onCleanup(() => observer.disconnect());
  return observer;
}
