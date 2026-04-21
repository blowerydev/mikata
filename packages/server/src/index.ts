/**
 * Server-side rendering for Mikata.
 *
 * `renderToString()` installs a minimal DOM shim on `globalThis.document`,
 * runs a component tree once inside a reactive scope, waits for any
 * `createQuery(...)` in-flight fetches to settle, serialises the result to
 * HTML, and tears everything down.
 *
 * The same `@mikata/runtime` module that runs on the client runs here —
 * we shim the DOM rather than ship a second compiled backend — so there
 * are no dual-tree divergence bugs by construction.
 */

import { createScope, flushSync } from '@mikata/reactivity';
import { _setSSR } from '@mikata/runtime';
import {
  beginCollect,
  endCollect,
  collectAll,
} from '@mikata/store';
import {
  installShim,
  type SNode,
} from './dom-shim';
import { serializeNode, renderStateScript, escapeStateScript } from './serialize';

export interface RenderToStringOptions {
  /**
   * Name of the global the state payload is assigned to. Default
   * `__MIKATA_STATE__`. Change if the consuming app already uses that name.
   */
  stateGlobal?: string;
  /**
   * Skip waiting on `createQuery(...)` calls. Use for pages that don't need
   * data hydration — faster, and the HTML contains query-loading states.
   * Default: `false`.
   */
  skipQueryCollection?: boolean;
}

export interface RenderToStringResult {
  /** Fully-serialised HTML for the component subtree. */
  html: string;
  /**
   * `<script>window.__MIKATA_STATE__ = {...}</script>` — safe to inline
   * in the page shell. Empty string if no queries were collected.
   */
  stateScript: string;
  /** The raw collected query payload (useful for custom embedding). */
  state: Record<string, unknown>;
}

/**
 * Render a Mikata component tree to an HTML string + state payload.
 *
 * The returned HTML can be inlined anywhere in a page; the returned
 * `stateScript` should be emitted before `hydrate()` runs so queries
 * auto-read their seed data from `window.__MIKATA_STATE__`.
 *
 * Usage:
 *   const { html, stateScript } = await renderToString(() => <App />);
 *   res.end(`<!doctype html>...<div id="root">${html}</div>${stateScript}...`);
 */
export async function renderToString(
  component: () => unknown,
  options: RenderToStringOptions = {},
): Promise<RenderToStringResult> {
  const shim = installShim();
  _setSSR(true);
  if (!options.skipQueryCollection) beginCollect();

  let root: SNode | null = null;
  let scopeDispose: (() => void) | null = null;
  try {
    const scope = createScope(() => {
      const result = component() as unknown;
      root = coerceToNode(result);
    });
    scopeDispose = () => scope.dispose();

    // Drain any synchronous reactive work so text-bakes and `_insert`
    // effects have populated their target nodes.
    flushSync();

    let state: Record<string, unknown> = {};
    if (!options.skipQueryCollection) {
      state = await collectAll();
      // A second sync flush — queries settling will have fired signals that
      // schedule more DOM updates.
      flushSync();
    }

    const html = root ? serializeNode(root) : '';
    const stateScript = Object.keys(state).length > 0
      ? renderStateScript(state, options.stateGlobal ?? '__MIKATA_STATE__')
      : '';

    return { html, stateScript, state };
  } finally {
    if (scopeDispose) scopeDispose();
    if (!options.skipQueryCollection) endCollect();
    _setSSR(false);
    shim.restore();
  }
}

function coerceToNode(value: unknown): SNode | null {
  if (value == null) return null;
  // Our shim uses SNode, but upstream types are `Node`. Duck-type on
  // nodeType so users returning real Node-shaped things pass through.
  if (typeof value === 'object' && value !== null && 'nodeType' in value) {
    return value as unknown as SNode;
  }
  return null;
}

export { installShim } from './dom-shim';
// Re-export the canonical SSR flag from `@mikata/runtime` so callers
// that only depend on `@mikata/server` can still branch on it without
// reaching for a second package.
export { isSSR } from '@mikata/runtime';
export { escapeStateScript, renderStateScript };
