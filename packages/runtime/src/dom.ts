/**
 * Low-level DOM helpers used by the compiled JSX output.
 * These are the runtime functions that the compiler emits calls to.
 */

import { renderEffect } from '@mikata/reactivity';
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
function applyStyleObject(el: HTMLElement, styles: Record<string, unknown>): void {
  for (const [prop, val] of Object.entries(styles)) {
    if (val == null || val === false) {
      el.style.removeProperty(prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
    } else {
      // camelCase → kebab-case for setProperty
      const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      el.style.setProperty(cssProp, String(val));
    }
  }
}

/**
 * Create a DOM element.
 */
export function _createElement(tag: string): HTMLElement {
  return document.createElement(tag);
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
export function _template(html: string): Node {
  const t = document.createElement('template');
  t.innerHTML = html;
  const root = t.content.firstChild!;
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
    return nativeClone(deep);
  };
  return root;
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
    document.addEventListener(eventName, delegatedEventHandler);
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
    } else if (typeof value === 'object' && value !== null) {
      applyStyleObject(el, value as Record<string, unknown>);
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

    renderEffect(() => {
      const hydrate = firstRun && isHydrating();
      // During hydration, scope the cursor to this parent so that any
      // `cloneNode()` calls inside the accessor adopt `parent`'s existing
      // children rather than siblings. After the first run we're in
      // steady-state and behave like a normal reactive insert.
      if (hydrate) pushFrame(parent);
      try {
        const value = (accessor as () => unknown)();
        const newNodes = resolveNodes(value);

        if (hydrate) {
          // Nodes were adopted in place — don't touch the DOM, just record
          // them so future updates can replace them.
          currentNodes = newNodes;
          return;
        }

        // Remove old nodes
        for (const node of currentNodes) {
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        }

        // Insert new nodes
        for (const node of newNodes) {
          if (marker) {
            parent.insertBefore(node, marker);
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
      pushFrame(parent);
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
}

/**
 * Merge multiple props objects, preserving getters.
 */
export function _mergeProps(
  ...sources: Record<string, unknown>[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const source of sources) {
    const descriptors = Object.getOwnPropertyDescriptors(source);
    Object.defineProperties(result, descriptors);
  }
  return result;
}
