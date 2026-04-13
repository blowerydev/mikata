/**
 * Low-level DOM helpers used by the compiled JSX output.
 * These are the runtime functions that the compiler emits calls to.
 */

import { renderEffect } from '@mikata/reactivity';

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

    renderEffect(() => {
      const value = (accessor as () => unknown)();
      const newNodes = resolveNodes(value);

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
    });
  } else {
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
 */
function resolveNodes(value: unknown): Node[] {
  if (value == null || typeof value === 'boolean') return [];
  if (value instanceof Node) return [value];
  if (Array.isArray(value)) return value.flatMap(resolveNodes);
  // String/number → text node
  return [document.createTextNode(String(value))];
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
