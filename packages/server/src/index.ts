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
import { _setSSR, hydrate } from '@mikata/runtime';
import {
  beginCollect,
  endCollect,
  collectAll,
} from '@mikata/store';
import {
  installShim,
  type SNode,
  type SElement,
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
  /**
   * After serialising, re-parse the HTML and run `hydrate()` against it
   * with the same component factory. Any thrown error is re-raised with
   * the offending HTML attached so prerender can surface it with the URL.
   *
   * Catches the class of bug that broke the docs app: SSR output whose
   * sibling counts desync from the template (so the client's compiled
   * index-based navigation walks onto the wrong node and crashes on
   * `.firstChild` of a text/comment). Opt-in because it doubles the
   * render cost; `@mikata/kit`'s prerender flips it on by default.
   */
  verifyHydration?: boolean;
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

    if (options.verifyHydration && html) {
      // Dispose the SSR scope first: hydrate spins up its own reactive
      // graph, and leaving the old one live would mean two scopes racing
      // to update the same DOM. The shim stays installed; hydrate's
      // `document.createElement`, template parsing, and `adoptNext`
      // cursor all work against SDocument just like they do client-side.
      if (scopeDispose) {
        scopeDispose();
        scopeDispose = null;
      }
      _setSSR(false);
      try {
        verifyHydrate(html, component);
      } finally {
        _setSSR(true);
      }
    }

    return { html, stateScript, state };
  } finally {
    if (scopeDispose) scopeDispose();
    if (!options.skipQueryCollection) endCollect();
    _setSSR(false);
    shim.restore();
  }
}

/**
 * Parse `html` into a shim container and run `hydrate()` against it with
 * `component`. Throws with the HTML attached if hydration raises — the
 * thrown error's stack still points at the offending runtime call, which
 * is usually enough to localise the failure.
 *
 * Called internally when `renderToString({ verifyHydration: true })`.
 */
function verifyHydrate(html: string, component: () => unknown): void {
  const doc = globalThis.document as unknown as {
    createElement(tag: string): SElement;
  };
  const container = doc.createElement('div');
  (container as unknown as { innerHTML: string }).innerHTML = html;

  try {
    const disposeHydrate = hydrate(
      component as () => Node,
      container as unknown as HTMLElement,
    );
    flushSync();
    disposeHydrate();
  } catch (err) {
    const cause = err instanceof Error ? err : new Error(String(err));
    const wrapped = new Error(
      `[mikata/server] hydration verify failed: ${cause.message}\n` +
        `  HTML (first 400 chars): ${html.slice(0, 400)}${html.length > 400 ? '...' : ''}`,
    );
    (wrapped as { cause?: unknown }).cause = cause;
    throw wrapped;
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
