/**
 * Minimal server-side DOM implementation.
 *
 * Shimmed onto `globalThis.document` during `renderToString()` so the
 * existing `@mikata/runtime` DOM helpers (which call `document.*` and
 * operate on Node-shaped objects) work unchanged server-side.
 *
 * The shim only implements what Mikata's runtime + compiler output
 * actually touch — not a full HTML5 DOM.
 */

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;
export const DOCUMENT_FRAGMENT_NODE = 11;

type NodeType =
  | typeof ELEMENT_NODE
  | typeof TEXT_NODE
  | typeof COMMENT_NODE
  | typeof DOCUMENT_FRAGMENT_NODE;

export abstract class SNode {
  abstract nodeType: NodeType;
  parentNode: SNode | null = null;
  childNodes: SNode[] = [];

  get firstChild(): SNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): SNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }

  get nextSibling(): SNode | null {
    const parent = this.parentNode;
    if (!parent) return null;
    const i = parent.childNodes.indexOf(this);
    return parent.childNodes[i + 1] ?? null;
  }

  get previousSibling(): SNode | null {
    const parent = this.parentNode;
    if (!parent) return null;
    const i = parent.childNodes.indexOf(this);
    return i <= 0 ? null : parent.childNodes[i - 1];
  }

  appendChild<T extends SNode>(child: T): T {
    if (child.nodeType === DOCUMENT_FRAGMENT_NODE) {
      const frag = child as unknown as SDocumentFragment;
      const kids = frag.childNodes.slice();
      for (const k of kids) {
        if (k.parentNode) k.parentNode.removeChild(k);
        k.parentNode = this;
        this.childNodes.push(k);
      }
      frag.childNodes = [];
      return child;
    }
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore<T extends SNode>(child: T, ref: SNode | null): T {
    if (!ref) return this.appendChild(child);
    const idx = this.childNodes.indexOf(ref);
    if (idx < 0) return this.appendChild(child);
    if (child.nodeType === DOCUMENT_FRAGMENT_NODE) {
      const frag = child as unknown as SDocumentFragment;
      const kids = frag.childNodes.slice();
      let at = idx;
      for (const k of kids) {
        if (k.parentNode) k.parentNode.removeChild(k);
        k.parentNode = this;
        this.childNodes.splice(at++, 0, k);
      }
      frag.childNodes = [];
      return child;
    }
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.splice(idx, 0, child);
    return child;
  }

  removeChild<T extends SNode>(child: T): T {
    const i = this.childNodes.indexOf(child);
    if (i >= 0) {
      this.childNodes.splice(i, 1);
      child.parentNode = null;
    }
    return child;
  }

  replaceChild(newChild: SNode, oldChild: SNode): SNode {
    const i = this.childNodes.indexOf(oldChild);
    if (i < 0) return oldChild;
    if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
    this.childNodes[i] = newChild;
    newChild.parentNode = this;
    oldChild.parentNode = null;
    return oldChild;
  }

  abstract cloneNode(deep?: boolean): SNode;

  // No-op listener API — server never dispatches events.
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return false;
  }
}

export class SText extends SNode {
  nodeType = TEXT_NODE as typeof TEXT_NODE;
  data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }

  get textContent(): string {
    return this.data;
  }

  set textContent(v: string) {
    this.data = v;
  }

  // Compiler text-bake optimisation writes to `.data` directly.
  cloneNode(): SText {
    return new SText(this.data);
  }
}

export class SComment extends SNode {
  nodeType = COMMENT_NODE as typeof COMMENT_NODE;
  data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }

  cloneNode(): SComment {
    return new SComment(this.data);
  }
}

class SStyle {
  private _text = '';
  private _props: Array<[string, string]> = [];

  get cssText(): string {
    if (this._text) return this._text;
    if (this._props.length === 0) return '';
    return this._props.map(([k, v]) => `${k}: ${v};`).join(' ');
  }

  set cssText(v: string) {
    this._text = v;
    this._props = [];
  }

  setProperty(prop: string, value: string): void {
    // Adopting a key wins — later sets replace earlier ones with the same prop.
    const i = this._props.findIndex(([k]) => k === prop);
    if (i >= 0) this._props[i][1] = value;
    else this._props.push([prop, value]);
    this._text = '';
  }

  removeProperty(prop: string): string {
    const i = this._props.findIndex(([k]) => k === prop);
    if (i >= 0) {
      const [, v] = this._props.splice(i, 1)[0];
      return v;
    }
    return '';
  }
}

export class SElement extends SNode {
  nodeType = ELEMENT_NODE as typeof ELEMENT_NODE;
  tagName: string; // uppercase, matches DOM
  private _attrs: Map<string, string> = new Map();
  private _style: SStyle = new SStyle();
  // Stored separately so the real-DOM `className` getter behaviour is faithful.
  private _className = '';
  // innerHTML content captured raw (used for the template-parsing path).
  private _innerHTMLRaw: string | null = null;

  constructor(tag: string) {
    super();
    this.tagName = tag.toUpperCase();
  }

  get nodeName(): string {
    return this.tagName;
  }

  // ---- attributes ----

  setAttribute(name: string, value: string): void {
    this._attrs.set(name, String(value));
  }

  getAttribute(name: string): string | null {
    return this._attrs.has(name) ? this._attrs.get(name)! : null;
  }

  hasAttribute(name: string): boolean {
    return this._attrs.has(name);
  }

  removeAttribute(name: string): void {
    this._attrs.delete(name);
  }

  /** Iterate all attributes — used by the serializer. */
  getAttributes(): Iterable<[string, string]> {
    return this._attrs.entries();
  }

  // ---- className / style / textContent / innerHTML ----

  get className(): string {
    return this._className;
  }

  set className(v: string) {
    this._className = v;
  }

  get style(): SStyle {
    return this._style;
  }

  set style(v: string | SStyle) {
    if (typeof v === 'string') {
      this._style.cssText = v;
    } else {
      this._style = v;
    }
  }

  get textContent(): string {
    let out = '';
    for (const c of this.childNodes) {
      if (c.nodeType === TEXT_NODE) out += (c as SText).data;
      else if (c.nodeType === ELEMENT_NODE) out += (c as SElement).textContent;
    }
    return out;
  }

  set textContent(v: string) {
    this.childNodes = [];
    if (v) {
      const t = new SText(v);
      t.parentNode = this;
      this.childNodes.push(t);
    }
  }

  get innerHTML(): string {
    if (this._innerHTMLRaw != null) return this._innerHTMLRaw;
    // Best-effort serialisation of current children.
    let out = '';
    for (const c of this.childNodes) out += serializeForInner(c);
    return out;
  }

  set innerHTML(v: string) {
    this._innerHTMLRaw = v;
    this.childNodes = [];
    if (this.tagName === 'TEMPLATE') {
      // <template>'s children live under .content.
      const content = (this as unknown as STemplateElement).content;
      content.childNodes = [];
      parseHTMLInto(v, content);
      return;
    }
    parseHTMLInto(v, this);
  }

  // ---- cloning ----

  cloneNode(deep?: boolean): SElement {
    const clone = new SElement(this.tagName);
    for (const [k, val] of this._attrs) clone._attrs.set(k, val);
    clone._className = this._className;
    // New style object — cloned nodes shouldn't share mutation state.
    const s = new SStyle();
    s.cssText = this._style.cssText;
    clone._style = s;
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  // ---- misc real-DOM shim hooks tolerated by runtime code ----

  querySelector(): SElement | null {
    // Portals that call this on the server render nothing.
    return null;
  }

  /** Reflow-forcing read in transition.ts — return a stable sentinel. */
  get offsetHeight(): number {
    return 0;
  }

  /** classList is only used by transitions; return a no-op. */
  get classList(): { add(): void; remove(): void; toggle(): void; contains(): boolean } {
    return NOOP_CLASSLIST;
  }
}

const NOOP_CLASSLIST = {
  add() {},
  remove() {},
  toggle() {},
  contains() {
    return false;
  },
};

export class SDocumentFragment extends SNode {
  nodeType = DOCUMENT_FRAGMENT_NODE as typeof DOCUMENT_FRAGMENT_NODE;

  cloneNode(deep?: boolean): SDocumentFragment {
    const clone = new SDocumentFragment();
    if (deep) {
      for (const c of this.childNodes) clone.appendChild(c.cloneNode(true));
    }
    return clone;
  }
}

/**
 * <template> — `innerHTML = "..."` parses the input into `.content`
 * (a DocumentFragment), matching real DOM semantics. The compiler uses
 * `_template('<div>...</div>').content.firstChild` indirectly via
 * `document.createElement('template')`; `firstChild` on the template
 * element itself returns the same parsed first child.
 */
class STemplateElement extends SElement {
  content: SDocumentFragment;

  constructor() {
    super('template');
    this.content = new SDocumentFragment();
  }

  get firstChild(): SNode | null {
    // `<template>.firstChild` on a template with innerHTML set returns its
    // content's first child in no-VDOM compilers (Mikata's runtime reads
    // `.content.firstChild` directly anyway — but we align for safety).
    return this.content.firstChild ?? super.firstChild;
  }
}

// ---------------------------------------------------------------------------
// Document shim + install/uninstall
// ---------------------------------------------------------------------------

class SDocument {
  createElement(tag: string): SElement {
    if (tag.toLowerCase() === 'template') return new STemplateElement();
    return new SElement(tag);
  }

  createTextNode(data: string): SText {
    return new SText(data);
  }

  createComment(data: string): SComment {
    return new SComment(data);
  }

  createDocumentFragment(): SDocumentFragment {
    return new SDocumentFragment();
  }

  // No-op event APIs for `_delegate` — server never bubbles events.
  addEventListener(): void {}
  removeEventListener(): void {}
}

export interface ShimHandle {
  document: SDocument;
  restore(): void;
}

let active: ShimHandle | null = null;

export function isServerRendering(): boolean {
  return active !== null;
}

export function installShim(): ShimHandle {
  if (active) return active;
  const globals = globalThis as unknown as Record<string, unknown>;
  const previousDocument = globals.document;
  const hadDocument = 'document' in globals;
  const doc = new SDocument();
  globals.document = doc;
  const handle: ShimHandle = {
    document: doc,
    restore() {
      if (hadDocument) globals.document = previousDocument;
      else delete globals.document;
      if (active === handle) active = null;
    },
  };
  active = handle;
  return handle;
}

// ---------------------------------------------------------------------------
// Minimal HTML parser (for template.innerHTML)
// ---------------------------------------------------------------------------
//
// The compiler emits a narrow subset of HTML via `emitTemplateHTML()` in
// `packages/compiler/src/transform.ts`:
//   - open/close tags with optional attrs (values always double-quoted)
//   - boolean attrs (bare attr name)
//   - void elements: area, base, br, col, embed, hr, img, input, link, meta,
//     source, track, wbr
//   - text (already HTML-escaped)
//   - comment placeholders: <!>
// We implement exactly that; anything richer goes through user `innerHTML`
// which the runtime warns about and doesn't walk over.

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

function parseHTMLInto(html: string, parent: SNode): void {
  let i = 0;
  const n = html.length;
  const stack: SNode[] = [parent];
  const top = () => stack[stack.length - 1];

  while (i < n) {
    const c = html[i];
    if (c === '<') {
      // Comment: <!-- ... --> or <!> bare
      if (html[i + 1] === '!') {
        const closeDash = html.indexOf('-->', i);
        if (html[i + 2] === '-' && html[i + 3] === '-' && closeDash > 0) {
          const data = html.slice(i + 4, closeDash);
          top().appendChild(new SComment(data));
          i = closeDash + 3;
          continue;
        }
        // <!> marker emitted by the compiler as a placeholder — parse as empty comment.
        const closeBracket = html.indexOf('>', i);
        if (closeBracket > 0) {
          top().appendChild(new SComment(''));
          i = closeBracket + 1;
          continue;
        }
      }
      // Close tag
      if (html[i + 1] === '/') {
        const closeBracket = html.indexOf('>', i);
        if (closeBracket < 0) break;
        if (stack.length > 1) stack.pop();
        i = closeBracket + 1;
        continue;
      }
      // Open tag
      const openEnd = findTagEnd(html, i + 1);
      if (openEnd < 0) break;
      const raw = html.slice(i + 1, openEnd);
      const { tag, attrs, selfClosing } = parseOpenTag(raw);
      const el = top().appendChild(new SElement(tag)) as SElement;
      for (const [k, v] of attrs) {
        if (k === 'class') el.className = v;
        else if (k === 'style') el.style = v;
        else el.setAttribute(k, v);
      }
      if (!VOID_ELEMENTS.has(tag.toLowerCase()) && !selfClosing) {
        stack.push(el);
      }
      i = openEnd + 1;
      continue;
    }

    // Text run up to next `<`.
    const next = html.indexOf('<', i);
    const end = next < 0 ? n : next;
    const text = html.slice(i, end);
    if (text) top().appendChild(new SText(unescapeEntities(text)));
    i = end;
  }
}

function findTagEnd(html: string, from: number): number {
  let inQuote: string | null = null;
  for (let i = from; i < html.length; i++) {
    const c = html[i];
    if (inQuote) {
      if (c === inQuote) inQuote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inQuote = c;
      continue;
    }
    if (c === '>') return i;
  }
  return -1;
}

function parseOpenTag(raw: string): { tag: string; attrs: Array<[string, string]>; selfClosing: boolean } {
  let i = 0;
  let selfClosing = false;
  // Tag name
  while (i < raw.length && /[A-Za-z0-9_\-]/.test(raw[i])) i++;
  const tag = raw.slice(0, i);
  const attrs: Array<[string, string]> = [];
  while (i < raw.length) {
    while (i < raw.length && /\s/.test(raw[i])) i++;
    if (i >= raw.length) break;
    if (raw[i] === '/') {
      selfClosing = true;
      i++;
      continue;
    }
    const nameStart = i;
    while (i < raw.length && !/[\s=/>]/.test(raw[i])) i++;
    const name = raw.slice(nameStart, i);
    if (!name) break;
    while (i < raw.length && /\s/.test(raw[i])) i++;
    if (raw[i] === '=') {
      i++;
      while (i < raw.length && /\s/.test(raw[i])) i++;
      const q = raw[i];
      if (q === '"' || q === "'") {
        const close = raw.indexOf(q, i + 1);
        if (close < 0) break;
        const value = raw.slice(i + 1, close);
        attrs.push([name, unescapeEntities(value)]);
        i = close + 1;
      } else {
        const vStart = i;
        while (i < raw.length && !/[\s>]/.test(raw[i])) i++;
        attrs.push([name, unescapeEntities(raw.slice(vStart, i))]);
      }
    } else {
      attrs.push([name, '']);
    }
  }
  return { tag, attrs, selfClosing };
}

function unescapeEntities(s: string): string {
  if (s.indexOf('&') < 0) return s;
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function serializeForInner(node: SNode): string {
  if (node.nodeType === TEXT_NODE) return escapeText((node as SText).data);
  if (node.nodeType === COMMENT_NODE) return `<!--${(node as SComment).data}-->`;
  if (node.nodeType === ELEMENT_NODE) {
    const el = node as SElement;
    const tag = el.tagName.toLowerCase();
    let out = `<${tag}`;
    if (el.className) out += ` class="${escapeAttr(el.className)}"`;
    const cssText = el.style.cssText;
    if (cssText) out += ` style="${escapeAttr(cssText)}"`;
    for (const [k, v] of el.getAttributes()) {
      out += v === '' ? ` ${k}` : ` ${k}="${escapeAttr(String(v))}"`;
    }
    out += '>';
    if (!VOID_ELEMENTS.has(tag)) {
      for (const c of el.childNodes) out += serializeForInner(c);
      out += `</${tag}>`;
    }
    return out;
  }
  return '';
}

function escapeText(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}
