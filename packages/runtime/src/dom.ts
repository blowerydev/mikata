/**
 * Low-level DOM helpers used by the compiled JSX output.
 * These are the runtime functions that the compiler emits calls to.
 */

import { renderEffect, suppressLeakTracking } from '@mikata/reactivity';
import { isSSR } from './env';
import { isHydrating, adoptNext, pushFrame, popFrame } from './adopt';

declare const __DEV__: boolean;

// Matches `<script`, `javascript:`, or inline `onXxx=` handlers - the three
// common XSS shapes people paste into innerHTML without thinking.
const SUSPICIOUS_INNER_HTML = /<script\b|javascript:|\son\w+\s*=/i;

/**
 * Resolve class value from string, object, array, or mix.
 *   resolveClass('foo')                    → 'foo'
 *   resolveClass({ active: true, hidden: false }) → 'active'
 *   resolveClass(['foo', { bar: true }])   → 'foo bar'
 */
function resolveClass(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(resolveClass).filter(Boolean).join(' ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ');
  }
  return value ? String(value) : '';
}

/**
 * Apply a style object to an element, converting camelCase to kebab-case.
 */
const STYLE_OBJECT_KEYS = new WeakMap<HTMLElement, Set<string>>();

function applyStyleObject(el: HTMLElement, styles: Record<string, unknown>): void {
  const nextKeys = new Set<string>();
  const previousKeys = STYLE_OBJECT_KEYS.get(el);

  for (const prop of Object.keys(styles)) {
    nextKeys.add(prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
  }

  if (previousKeys) {
    for (const prop of previousKeys) {
      if (!nextKeys.has(prop)) {
        el.style.removeProperty(prop);
      }
    }
  }

  for (const [prop, val] of Object.entries(styles)) {
    const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
    if (val == null || val === false) {
      el.style.removeProperty(cssProp);
    } else {
      // camelCase → kebab-case for setProperty
      el.style.setProperty(cssProp, String(val));
    }
  }

  STYLE_OBJECT_KEYS.set(el, nextKeys);
}

/**
 * Create a DOM element.
 */
export function _createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

/**
 * Hydration-aware element builder for hand-written components that
 * assemble their DOM with `document.createElement` + `appendChild`
 * instead of JSX.
 *
 * Without this, imperative components bypass the adoption cursor: the
 * server renders a `<button>` with children, but on hydration the
 * component calls `document.createElement('button')` to get a *fresh*
 * element, attaches all its reactive effects to that orphan, and leaves
 * the server's button in the DOM with no handlers wired. ThemeProvider,
 * all of @mikata/ui, and anything else using the imperative pattern has
 * this shape.
 *
 * Usage:
 *   return adoptElement('button', (el) => {
 *     renderEffect(() => { el.className = mergeClasses(...); });
 *     adoptElement('span', (label) => {
 *       renderEffect(() => { label.textContent = props.text; });
 *     });
 *     // no appendChild — nested adoptElement auto-attaches to `el`
 *   });
 *
 * Children created by nested `adoptElement` calls inside `setup` are
 * auto-attached to the outer element. On the client render path they
 * get appended. During hydration they're adopted in place from the
 * server output (and auto-attach is a no-op since they're already
 * there). This matches how JSX compilation handles parent/child wiring
 * — the user never writes `appendChild` manually.
 *
 * Tag mismatches at hydration time throw in dev with a diagnostic that
 * names the expected tag, the node actually at the cursor, and the most
 * common root cause (a component factory invoked outside a JSX slot,
 * which silently consumes the wrong SSR node and desyncs every later
 * adopt). In production the mismatch falls through to a fresh element
 * so a single drifted node doesn't take the whole page down; the
 * orphaned SSR node is left in place but unreferenced. Cursor
 * exhaustion (no node at all) still falls through silently in both
 * modes — that's the legitimate "client rendered more than server"
 * path.
 */
export function adoptElement<T extends HTMLElement = HTMLElement>(
  tag: string,
  setup?: (el: T) => void,
): T {
  let el: T;
  if (isHydrating()) {
    const adopted = adoptNext();
    if (
      adopted &&
      adopted.nodeType === 1 &&
      (adopted as Element).tagName.toUpperCase() === tag.toUpperCase()
    ) {
      el = adopted as unknown as T;
    } else {
      if (__DEV__ && adopted) {
        throw new Error(
          `[mikata] adoptElement("${tag}") mismatch: hydration cursor ` +
            `pointed at ${describeAdoptedNode(adopted)}, but this component ` +
            `expected <${tag}>. This usually means a component factory was ` +
            `invoked outside its JSX slot (e.g. \`const x = Button(props)\` ` +
            `at module/function top level instead of \`<Button />\` or ` +
            `\`{() => Button(props)}\` inside JSX), so the wrong SSR node ` +
            `was consumed and every later adopt is desynced. Less commonly, ` +
            `the client tree genuinely diverged from the server output at ` +
            `this slot.`,
        );
      }
      el = document.createElement(tag) as unknown as T;
    }
  } else {
    el = document.createElement(tag) as unknown as T;
  }

  // Auto-attach to an enclosing `adoptElement` setup's element. On the
  // hydrate path the node is almost always already attached (we adopted
  // it from its parent's children) so `appendChild` is a no-op; we guard
  // it anyway in case the adopted node drifted out of the expected spot.
  const parent = currentSetupParent();
  if (parent && el.parentNode !== parent) {
    parent.appendChild(el);
  }

  if (setup) {
    pushFrame(el, 0);
    setupStack.push(el);
    try {
      setup(el);
    } finally {
      setupStack.pop();
      popFrame();
    }
  }
  return el;
}

// Tracks the innermost `adoptElement(_, setup)` element so nested
// `adoptElement` calls can auto-attach. A parallel array to the
// adoption frame stack, but specific to the setup callback scope.
const setupStack: HTMLElement[] = [];
function currentSetupParent(): HTMLElement | null {
  return setupStack.length ? setupStack[setupStack.length - 1]! : null;
}

// Short human-readable description of whatever the cursor landed on.
// Used only by the dev-mode adoptElement mismatch error — the id/class
// hints help locate the offending SSR node in the rendered HTML.
function describeAdoptedNode(node: Node): string {
  if (node.nodeType === 3) return 'a text node';
  if (node.nodeType === 8) return 'a comment node';
  if (node.nodeType !== 1) return `a node (type ${node.nodeType})`;
  const el = node as Element;
  const tag = el.tagName?.toLowerCase() ?? 'unknown';
  const id = el.id ? `#${el.id}` : '';
  const cls =
    typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).join('.')
      : '';
  return `<${tag}${id}${cls}>`;
}

/**
 * Parse a static HTML fragment once and return its root node so the compiler
 * can `cloneNode(true)` it per instantiation instead of issuing a chain of
 * `createElement` + `appendChild` calls.
 *
 * The HTML is parsed inside a `<template>` element, which has looser parser
 * rules than a generic host — notably, `<tr>` and `<td>` don't need to live
 * under an actual `<table>`, so we can template rows directly.
 *
 * The compiler calls this once per unique JSX skeleton at module load:
 *   const _tmpl$0 = _template('<tr><td class="col-md-1"></td></tr>');
 *
 * Per-instantiation:
 *   const el = _tmpl$0.cloneNode(true);  // ~3x cheaper than rebuilding
 */
const TEMPLATE_CACHE = new WeakMap<Document, Map<string, Node>>();

export function _template(html: string): Node {
  let cache = TEMPLATE_CACHE.get(document);
  if (!cache) {
    cache = new Map();
    TEMPLATE_CACHE.set(document, cache);
  }
  const cached = cache.get(html);
  if (cached) return cached;

  const t = document.createElement('template');
  t.innerHTML = html;
  const root = t.content.firstChild!;
  const fastClone = createSimpleTemplateClone(root);
  // Swap the per-instance `cloneNode` so that during hydration it pops the
  // next unclaimed node from the adoption cursor instead of creating a
  // fresh deep clone. Non-hydrating callers go through the native path and
  // pay nothing for the check.
  const nativeClone = root.cloneNode.bind(root);
  (root as unknown as { cloneNode: (deep?: boolean) => Node }).cloneNode = (deep?: boolean) => {
    if (isHydrating()) {
      const adopted = adoptNext();
      if (adopted) return adopted;
    }
    if (fastClone) return fastClone(deep !== false);
    return nativeClone(deep);
  };
  cache.set(html, root);
  return root;
}

function createSimpleTemplateClone(root: Node): ((deep: boolean) => Node) | null {
  if (
    root.nodeType !== 1 ||
    (root as Element).namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
    (root as Element).attributes.length !== 0
  ) {
    return null;
  }

  const element = root as HTMLElement;
  const tagName = element.localName;
  const first = element.firstChild;
  if (!first) {
    return () => document.createElement(tagName);
  }
  if (first.nodeType === 3 && first.nextSibling === null) {
    const text = (first as Text).data;
    return (deep: boolean) => {
      const clone = document.createElement(tagName);
      if (deep) clone.textContent = text;
      return clone;
    };
  }
  return null;
}

/**
 * Event delegation. Compiler emits `_delegate(el, "click", h)` instead of
 * `el.addEventListener("click", h)` for bubbling events — for a 10k-row list
 * that's 10k listener registrations collapsed to one document-level listener
 * per event type. Handlers are stashed as `el.$$click = h` and found by
 * walking from `e.target` up through parents.
 */
const DELEGATED_EVENTS = new Set<string>();

function delegatedEventHandler(e: Event): void {
  const prop = `$$${e.type}`;
  let node: Node | null =
    ((e.composedPath && e.composedPath()[0]) as Node) || (e.target as Node);
  // Override currentTarget so handlers read the element they were attached to,
  // not document. Retained across the walk — handlers typically read it once.
  if (node) {
    Object.defineProperty(e, 'currentTarget', {
      configurable: true,
      get() {
        return node || document;
      },
    });
  }
  while (node) {
    const handler = (node as any)[prop];
    if (handler && !(node as any).disabled) {
      handler.call(node, e);
      if (e.cancelBubble) return;
    }
    node = node.parentNode || ((node as any).host as Node | null);
  }
}

export function _delegate(
  el: Element,
  eventName: string,
  handler: EventListener
): void {
  // On the server the handler is unreachable (no runtime events) — skip the
  // `$$` stash and don't populate DELEGATED_EVENTS, otherwise the shim's
  // document would claim the event and the real `document.addEventListener`
  // wouldn't get attached the next time we run on the client.
  if (isSSR()) return;
  (el as any)[`$$${eventName}`] = handler;
  if (!DELEGATED_EVENTS.has(eventName)) {
    DELEGATED_EVENTS.add(eventName);
    // Page-lifetime listener registered once per event type. Suppressed
    // from leak counting because it has no per-component cleanup point;
    // the document outlives every effect that triggers this branch.
    suppressLeakTracking(() =>
      document.addEventListener(eventName, delegatedEventHandler),
    );
  }
}

/**
 * Set a property/attribute on an element.
 * Handles the common cases: className, style, boolean attrs, etc.
 */
export function _setProp(
  el: HTMLElement,
  key: string,
  value: unknown
): void {
  if (key === 'ref') {
    // ref callback or ref object
    if (typeof value === 'function') {
      (value as (el: HTMLElement) => void)(el);
    } else if (value && typeof value === 'object' && 'current' in value) {
      (value as { current: HTMLElement | null }).current = el;
    }
    return;
  } else if (key === 'class' || key === 'className') {
    el.className = resolveClass(value);
  } else if (key === 'style') {
    if (typeof value === 'string') {
      el.style.cssText = value;
      STYLE_OBJECT_KEYS.delete(el);
    } else if (typeof value === 'object' && value !== null) {
      applyStyleObject(el, value as Record<string, unknown>);
    } else if (value == null || value === false) {
      el.style.cssText = '';
      STYLE_OBJECT_KEYS.delete(el);
    }
  } else if (key === 'innerHTML' || key === 'textContent') {
    if (__DEV__ && key === 'innerHTML' && typeof value === 'string' && SUSPICIOUS_INNER_HTML.test(value)) {
      console.warn(
        '[mikata] innerHTML contains content that looks like a script or inline event handler. ' +
        'Use textContent or sanitize the input - innerHTML bypasses all escaping.'
      );
    }
    (el as any)[key] = value;
  } else if (key in el) {
    // DOM property
    try {
      (el as any)[key] = value;
    } catch {
      el.setAttribute(key, String(value));
    }
  } else if (typeof value === 'boolean') {
    if (value) {
      el.setAttribute(key, '');
    } else {
      el.removeAttribute(key);
    }
  } else if (value == null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, String(value));
  }
}

/**
 * Insert a child into a parent element. Handles static values,
 * reactive expressions (functions), arrays, and nodes.
 */
export function _insert(
  parent: HTMLElement,
  accessor: (() => unknown) | unknown,
  marker?: Node
): void {
  if (typeof accessor === 'function') {
    // Reactive child - set up an effect
    let currentNodes: Node[] = [];
    let firstRun = true;
    // After hydration, `marker` (the compiler-passed anchor node) is often
    // the SSR content we're about to replace, not a stable comment. Once
    // we remove `currentNodes` on the next update, insertBefore(..., marker)
    // would throw because marker is no longer in `parent`. Compute a
    // post-hydration anchor (the first static sibling after our adopted
    // content) and use it from the second run onward.
    let effectiveMarker = marker;
    // When the accessor produces multiple nodes at a mid-tree slot (a
    // slot with static siblings after it), we wrap them in a synthetic
    // `<mkt-slot>` element. Without the wrapper the SSR HTML contains
    // N content nodes where the template reserved 1, so the client's
    // index-based navigation (`.firstChild.nextSibling×K`) walks onto
    // the wrong node for every subsequent static sibling. `<mkt-slot>`
    // uses `display:contents` so it's layout-invisible.
    let slot: HTMLElement | null = null;

    renderEffect(() => {
      const hydrate = firstRun && isHydrating();

      if (hydrate) {
        // SSR may have already wrapped this slot. When the marker we
        // navigated to is a `<mkt-slot>`, enter it so adoption pops
        // the wrapped children in order.
        if (isMktSlot(marker)) {
          slot = marker as HTMLElement;
          pushFrame(slot, 0);
        } else {
          // Scope the adoption cursor to `parent` starting at the
          // marker's index so any `cloneNode()` calls inside the
          // accessor adopt the correct sibling.
          pushFrame(parent, markerIndex(parent, marker));
        }
      }

      try {
        const value = (accessor as () => unknown)();
        const newNodes = resolveNodes(value);

        if (hydrate) {
          currentNodes = newNodes;
          if (slot) {
            // effectiveMarker isn't needed for reactive updates when
            // a slot exists — we replace the slot's children wholesale.
            effectiveMarker = undefined;
          } else {
            const last = newNodes[newNodes.length - 1];
            effectiveMarker = last?.nextSibling ?? undefined;
          }
          return;
        }

        // Non-hydrating path.

        // If we've established a slot (either from a prior multi-node
        // render or adopted from SSR), all updates happen inside it.
        if (slot) {
          while (slot.firstChild) slot.removeChild(slot.firstChild);
          for (const node of newNodes) slot.appendChild(node);
          currentNodes = newNodes;
          return;
        }

        // Text-node fast path: single existing text node + single new
        // text node → mutate `.data` in place. Keeps the per-update cost
        // of `{signal()}`-style reactive text at one DOM write, matching
        // the template text-bake path. Only applies outside the slot
        // wrapper and when the existing node is still attached.
        if (
          !slot &&
          currentNodes.length === 1 &&
          (currentNodes[0] as Node).nodeType === 3 &&
          (currentNodes[0] as Node).parentNode === parent &&
          newNodes.length === 1 &&
          (newNodes[0] as Node).nodeType === 3
        ) {
          const existing = currentNodes[0] as Text;
          const next = newNodes[0] as Text;
          if (existing.data !== next.data) existing.data = next.data;
          return;
        }

        // Clear the previous render's nodes before deciding the next
        // placement. Doing this before the wrapper branch keeps the
        // parent's child list in a known state — important because the
        // eventual `insertBefore(slot, anchor)` below needs `anchor` to
        // still be a valid sibling.
        for (const node of currentNodes) {
          if (node.parentNode === parent) parent.removeChild(node);
        }

        const anchor =
          effectiveMarker && effectiveMarker.parentNode === parent
            ? effectiveMarker
            : null;

        // First-time multi-node at a mid-tree slot: wrap in `<mkt-slot>`
        // so the SSR/HTML structural count stays at 1 per dynamic slot.
        // Skip the wrap for tail slots (no marker) and single-node
        // slots — those don't desync.
        if (newNodes.length > 1 && marker !== undefined) {
          slot = document.createElement('mkt-slot');
          slot.setAttribute('style', 'display:contents');
          for (const node of newNodes) slot.appendChild(node);
          if (anchor) {
            parent.insertBefore(slot, anchor);
          } else {
            parent.appendChild(slot);
          }
          currentNodes = newNodes;
          effectiveMarker = undefined;
          return;
        }

        for (const node of newNodes) {
          if (anchor) {
            parent.insertBefore(node, anchor);
          } else {
            parent.appendChild(node);
          }
        }

        currentNodes = newNodes;
      } finally {
        if (hydrate) popFrame();
        firstRun = false;
      }
    });
  } else {
    // Static insert. During hydration, the server already emitted these
    // nodes — skip the DOM op and just advance the cursor.
    if (isHydrating()) {
      pushFrame(parent, markerIndex(parent, marker));
      try {
        resolveNodes(accessor);
      } finally {
        popFrame();
      }
      return;
    }
    const nodes = resolveNodes(accessor);
    for (const node of nodes) {
      if (marker) {
        parent.insertBefore(node, marker);
      } else {
        parent.appendChild(node);
      }
    }
  }
}

/**
 * Resolve a value into DOM nodes.
 *
 * Uses a duck-type check (`nodeType` is present) instead of `instanceof Node`
 * so the `@mikata/server` DOM shim — which installs its own node classes on
 * `globalThis.document` — flows through unchanged. In the browser every real
 * Node has `nodeType`, so the check is equivalent.
 */
/**
 * Index of `marker` among `parent.childNodes`, or 0 if marker is absent
 * or not a direct child. Used by `_insert` to position the hydration
 * cursor at the right slot within `parent`.
 */
function markerIndex(parent: Node, marker?: Node): number {
  if (!marker || marker.parentNode !== parent) return 0;
  const children = parent.childNodes;
  for (let i = 0; i < children.length; i++) {
    if (children[i] === marker) return i;
  }
  return 0;
}

/**
 * Identify the `<mkt-slot>` wrapper emitted around multi-node dynamic
 * content at mid-tree positions. Works across the shim too — we check
 * `nodeType === 1` before reaching for `tagName`, and uppercase the
 * result so jsdom (always uppercase) and the server shim (as-provided)
 * both match.
 */
function isMktSlot(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if ((node as Node).nodeType !== 1) return false;
  const tag = (node as Element).tagName;
  return typeof tag === 'string' && tag.toUpperCase() === 'MKT-SLOT';
}

function resolveNodes(value: unknown): Node[] {
  if (value == null || typeof value === 'boolean') return [];
  if (isNodeLike(value)) return [value as Node];
  if (Array.isArray(value)) return value.flatMap(resolveNodes);
  // String/number → text node
  return [document.createTextNode(String(value))];
}

export function isNodeLike(v: unknown): boolean {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { nodeType?: unknown }).nodeType === 'number'
  );
}

/**
 * Create a DocumentFragment from an array of children.
 */
export function _createFragment(children: unknown[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    const nodes = resolveNodes(child);
    for (const node of nodes) {
      frag.appendChild(node);
    }
  }
  return frag;
}

/**
 * Spread an object of props onto an element, with reactive support.
 *
 * Event handlers (onClick, onInput, ...) are swapped via remove/addEventListener
 * each time props change, so repeated spread updates don't accumulate listeners.
 * Non-handler props fall through to `_setProp`.
 */
export function _spread(
  el: HTMLElement,
  accessor: () => Readonly<Record<string, unknown>>,
): void {
  // Track the last handler attached per event name so we can remove it before
  // attaching the next one on subsequent runs.
  const attached = new Map<string, EventListener>();

  renderEffect(() => {
    const props = accessor();
    const seenEvents = new Set<string>();

    // Listener swapping is paired (remove-prev + add-next) inside the
    // same renderEffect run, and the orphan sweep below removes any
    // handler that drops out of `props`. Suppressed from leak counting
    // because the runtime guarantees the matching teardown.
    suppressLeakTracking(() => {
      for (const [key, value] of Object.entries(props)) {
        if (/^on[A-Z]/.test(key)) {
          const eventName = key.slice(2).toLowerCase();
          seenEvents.add(eventName);
          const prev = attached.get(eventName);
          if (prev === value) continue;
          if (prev) el.removeEventListener(eventName, prev);
          if (typeof value === 'function') {
            el.addEventListener(eventName, value as EventListener);
            attached.set(eventName, value as EventListener);
          } else {
            attached.delete(eventName);
          }
        } else {
          _setProp(el, key, value);
        }
      }

      // Any handler registered last run but omitted this run must be removed.
      for (const [eventName, handler] of attached) {
        if (!seenEvents.has(eventName)) {
          el.removeEventListener(eventName, handler);
          attached.delete(eventName);
        }
      }
    });
  });
}

type UnionToIntersection<U> =
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void
    ? I
    : never;

/**
 * Merge multiple props objects into a new one, preserving getter
 * descriptors. Later sources win on key collisions.
 *
 * This is the escape hatch for *programmatic* prop construction - the
 * JSX compiler already emits getters for `<Component attr={expr} />`
 * call sites, so reactivity is automatic there. The moment you build a
 * props object in user code (default-merging, forwarding, overriding in
 * a loop), plain property assignment snapshots the value and breaks
 * reactivity. `mergeProps` threads each source through
 * `Object.getOwnPropertyDescriptors` so a `get foo()` getter on any
 * source survives the merge and re-reads on access.
 *
 * The result type is the intersection of the source types, so callers
 * get typed output without a trailing `as` cast. Pair with `splitProps`
 * for the inverse (extract a typed subset while keeping getters live).
 *
 * Exported under two names:
 *   - `_mergeProps` is the compiler-emitted import - keep the underscore
 *     prefix in generated code so user code and compiler output never
 *     collide in searches.
 *   - `mergeProps` is the stable user-facing name. Use this in
 *     components and app code (see `Button.tsx` for the canonical
 *     default-merging pattern).
 */
export function _mergeProps<Sources extends readonly object[]>(
  ...sources: Sources
): UnionToIntersection<Sources[number]> {
  const result = {} as Record<string, unknown>;
  for (const source of sources) {
    const descriptors = Object.getOwnPropertyDescriptors(source);
    Object.defineProperties(result, descriptors);
  }
  return result as UnionToIntersection<Sources[number]>;
}

export { _mergeProps as mergeProps };

/**
 * Extract a typed subset of a props object, returning `[picked, rest]`.
 * Both halves preserve getter descriptors - reactivity survives the
 * split on either side. The inverse of `mergeProps`.
 *
 * The canonical use is forwarding: pluck the keys a component handles
 * itself, spread the remainder onto the underlying element. Because
 * getters survive, downstream reads inside `renderEffect` still track
 * the upstream signals, so the component updates in place when a
 * forwarded prop changes.
 *
 * Example:
 *   function MyButton(props: ButtonProps & { extra?: string }) {
 *     const [local, rest] = splitProps(props, ['extra']);
 *     // `rest` is typed ButtonProps, `local` is { extra?: string }
 *     return <Button {...rest} data-extra={local.extra} />;
 *   }
 *
 * Keys listed but absent on `source` are not defined on `picked`, so
 * `mergeProps(defaults, picked)` doesn't get spuriously overridden by
 * undefined slots.
 */
export function splitProps<
  T extends object,
  const K extends readonly (keyof T)[],
>(
  source: T,
  keys: K,
): [Pick<T, K[number]>, Omit<T, K[number]>] {
  const picked = {} as Record<PropertyKey, unknown>;
  const rest = {} as Record<PropertyKey, unknown>;
  const pickSet = new Set<PropertyKey>(keys as readonly PropertyKey[]);
  for (const name of Object.keys(source)) {
    const descriptor = Object.getOwnPropertyDescriptor(source, name);
    if (!descriptor) continue;
    if (pickSet.has(name)) {
      Object.defineProperty(picked, name, descriptor);
    } else {
      Object.defineProperty(rest, name, descriptor);
    }
  }
  return [
    picked as Pick<T, K[number]>,
    rest as Omit<T, K[number]>,
  ];
}

/**
 * Wrap a map of `{ key: () => value }` into a props-shaped object whose
 * every property is a getter. Pass the result to a component and each
 * `props.key` access inside a `renderEffect` subscribes to the getter's
 * reactive dependencies - the component is created once and updates in
 * place as the underlying signals change.
 *
 * This is what you reach for when building props from a dynamic source
 * (a list of controls, a loader result keyed by name, etc.) rather than
 * JSX attributes. For JSX (`<Button size={x()} />`) the compiler already
 * emits getters, so you don't need this helper there.
 *
 * Example:
 *   const [size, setSize] = signal<'sm' | 'md'>('md');
 *   const props = reactiveProps({ size });      // getter-backed
 *   Button(props);                              // mount once
 *   setSize('sm');                              // Button updates in place
 */
export function reactiveProps<T extends Record<string, unknown>>(
  getters: { readonly [K in keyof T]: () => T[K] },
): T {
  const out = {} as Record<string, unknown>;
  for (const key of Object.keys(getters)) {
    Object.defineProperty(out, key, {
      // Enumerable so `_mergeProps` / `{ ...out }` still pick it up;
      // configurable so downstream helpers can redefine on top.
      get: getters[key as keyof T] as () => unknown,
      enumerable: true,
      configurable: true,
    });
  }
  return out as T;
}
