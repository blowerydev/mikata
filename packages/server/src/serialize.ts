/**
 * HTML serialization for server-rendered nodes + safe JSON state embedding.
 */

import {
  ELEMENT_NODE,
  TEXT_NODE,
  COMMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
  type SNode,
  type SElement,
  type SText,
  type SComment,
} from './dom-shim';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

/** Stringify an S-DOM subtree to HTML, escaping text and attributes. */
export function serializeNode(node: SNode): string {
  if (node.nodeType === TEXT_NODE) {
    return escapeText((node as SText).data);
  }
  if (node.nodeType === COMMENT_NODE) {
    const data = (node as SComment).data;
    // Compiler-emitted template markers (`<!>`, parsed as empty comments)
    // do not survive serialization. Keeping them would inflate SSR child
    // counts: templates have [static, <!>, static], but after rendering
    // the tree is [static, content, <!>, static]. The client's compiled
    // navigation walks `.firstChild.nextSibling` by template index, so
    // the extra comment desynchronises every lookup. Dropping the marker
    // leaves [static, content, static], which matches the template
    // structurally (single-root dynamic content replaces the marker).
    // Named comments (e.g. `<!--each-->`) are runtime-created and kept.
    if (data === '') return '';
    return `<!--${data}-->`;
  }
  if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
    let out = '';
    for (const c of node.childNodes) out += serializeNode(c);
    return out;
  }
  if (node.nodeType === ELEMENT_NODE) {
    return serializeElement(node as SElement);
  }
  return '';
}

function serializeElement(el: SElement): string {
  const tag = el.tagName.toLowerCase();
  let out = `<${tag}`;

  if (el.className) {
    out += ` class="${escapeAttr(el.className)}"`;
  }
  const cssText = el.style.cssText;
  if (cssText) {
    out += ` style="${escapeAttr(cssText)}"`;
  }
  for (const [k, v] of el.getAttributes()) {
    // Drop any `on*` attributes that snuck in — server never emits handlers.
    if (/^on[A-Z]/.test(k) || /^on[a-z]+$/.test(k)) continue;
    out += v === '' ? ` ${k}` : ` ${k}="${escapeAttr(String(v))}"`;
  }
  out += '>';

  if (VOID_ELEMENTS.has(tag)) return out;

  for (const c of el.childNodes) out += serializeNode(c);
  out += `</${tag}>`;
  return out;
}

/**
 * Escape HTML text content. `<`, `>`, `&` is enough for text — quotes
 * don't need escaping outside attribute values.
 */
function escapeText(s: unknown): string {
  return String(s ?? '').replace(/[<>&]/g, (c) => TEXT_ESCAPES[c]!);
}

const TEXT_ESCAPES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
};

/** Escape an attribute value. `"` is the delimiter, so it must go. */
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * Serialise a JSON-stringifiable value for embedding inside a `<script>` tag.
 *
 * Escapes characters that could break out of the script context:
 *   - `<` → `\u003c` (breaks `</script>`, `<!--`, `<script` sequences)
 *   - `>` → `\u003e` (defence in depth)
 *   - `&` → `\u0026` (defence in depth)
 *   - U+2028 / U+2029 — valid JSON but invalid JS string literals; some
 *     older parsers choke.
 *
 * Replacing `<` with `\u003c` keeps the JSON valid and prevents any
 * attacker-controlled string from closing the script element — the
 * defensive posture React2Shell recommends against custom deserialisers.
 */
export function escapeStateScript(jsonText: string): string {
  return jsonText.replace(/[<>&\u2028\u2029]/g, (c) => STATE_ESCAPES[c]!);
}

const STATE_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Build the `<script>` tag that primes `window.__MIKATA_STATE__` for the
 * client. `state` must be a plain JSON-stringifiable value.
 */
export function renderStateScript(
  state: unknown,
  globalName = '__MIKATA_STATE__',
): string {
  const json = JSON.stringify(state ?? {});
  const safe = escapeStateScript(json);
  // `window.` rather than bare assignment — older engines choke on the latter
  // at the top level of a script.
  return `<script>window.${globalName}=${safe}</script>`;
}
