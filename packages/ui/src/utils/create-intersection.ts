import { signal, onCleanup, type ReadSignal } from '@mikata/reactivity';
import type { Ref } from '@mikata/runtime';

/**
 * Track whether a referenced element is intersecting the viewport
 * (or a custom `root`). Backed by `IntersectionObserver`.
 *
 * Usage:
 *   const ref = createRef<HTMLDivElement>();
 *   const { entry, isIntersecting } = createIntersection(ref);
 */
export function createIntersection(
  ref: Ref<Element>,
  options?: IntersectionObserverInit
): {
  entry: ReadSignal<IntersectionObserverEntry | null>;
  isIntersecting: ReadSignal<boolean>;
} {
  const [entry, setEntry] = signal<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIntersecting] = signal(false);

  let observer: IntersectionObserver | null = null;
  const attach = () => {
    const el = ref.current;
    if (!el || observer) return;
    observer = new IntersectionObserver(([e]) => {
      setEntry(() => e);
      setIntersecting(e.isIntersecting);
    }, options);
    observer.observe(el);
  };

  // Defer to next microtask so the ref is populated after render
  queueMicrotask(attach);

  onCleanup(() => observer?.disconnect());

  return { entry, isIntersecting };
}
