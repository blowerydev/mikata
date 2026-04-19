/**
 * Per-route `<head>` management for `@mikata/kit`.
 *
 *   // routes/users/[id].tsx
 *   import { useMeta } from '@mikata/kit/head';
 *   export default function User() {
 *     const data = useLoaderData<typeof load>();
 *     useMeta(() => ({
 *       title: `${data()?.user.name ?? 'Loading'} — MyApp`,
 *       description: data()?.user.bio ?? '',
 *     }));
 *     // ...
 *   }
 *
 * Data flow:
 *
 *   Server render  →  `renderRoute` provides a collect-mode registry.
 *                     Every `useMeta()` call appends a descriptor. After
 *                     render the registry serialises to an HTML string
 *                     and the result is spliced into the template's
 *                     `<head>` at `<!--mikata-head-->` (or before
 *                     `</head>` if the marker is absent).
 *   Client mount   →  `mount()` provides a DOM-mode registry whose
 *                     target is `document.head`. Each `useMeta()` call
 *                     creates tag elements, marks them with
 *                     `data-mikata-head`, and stacks them under a dedup
 *                     key so nested layouts can override a parent's
 *                     `<title>` cleanly.
 *   Scope dispose  →  Removes only the tags that scope owned, re-attaching
 *                     the previous owner's tag when it was stacked
 *                     beneath the popped one (stack-based dedup).
 */

import { effect, getCurrentScope, onCleanup } from '@mikata/reactivity';
import { createContext, provide, inject } from '@mikata/runtime';

export interface MetaEntry {
  /** `<meta name="...">` — dedup key for named metas. */
  name?: string;
  /** `<meta property="...">` — dedup key for OpenGraph / Twitter. */
  property?: string;
  /** `<meta http-equiv="...">` — dedup key for HTTP-equiv metas. */
  httpEquiv?: string;
  /** `<meta content="...">` — the actual value. */
  content: string;
  /**
   * Any other attributes: `charset`, `media`, etc. Keys are emitted
   * verbatim so kebab-case is your responsibility (`httpEquiv` is the
   * one exception — it maps to `http-equiv`).
   */
  [attr: string]: string | undefined;
}

export interface LinkEntry {
  rel: string;
  href: string;
  /** Additional attributes: `crossorigin`, `media`, `sizes`, `type`, … */
  [attr: string]: string | undefined;
}

export interface MetaDescriptor {
  /** Document `<title>`. Last-writer-wins across nested scopes. */
  title?: string;
  /**
   * Shortcut for `<meta name="description" content="...">`. Deduplicates
   * with anything else keyed at `meta:name:description`.
   */
  description?: string;
  /** Extra `<meta>` tags. Dedup by name/property/http-equiv. */
  meta?: readonly MetaEntry[];
  /**
   * `<link>` tags. No dedup except for `rel="canonical"` which is
   * last-writer-wins.
   */
  link?: readonly LinkEntry[];
}

type MetaInput = MetaDescriptor | (() => MetaDescriptor);

// ---------------------------------------------------------------------------
// internal tag representation
// ---------------------------------------------------------------------------

type Tag =
  | { kind: 'title'; value: string }
  | { kind: 'meta'; attrs: Record<string, string> }
  | { kind: 'link'; attrs: Record<string, string> };

function dedupKey(tag: Tag): string | null {
  if (tag.kind === 'title') return 'title';
  if (tag.kind === 'meta') {
    if (tag.attrs.name) return `meta:name:${tag.attrs.name}`;
    if (tag.attrs.property) return `meta:property:${tag.attrs.property}`;
    if (tag.attrs['http-equiv']) return `meta:http-equiv:${tag.attrs['http-equiv']}`;
    return null;
  }
  // <link>: only canonical dedupes in v1.
  if (tag.attrs.rel === 'canonical') return 'link:canonical';
  return null;
}

function descriptorToTags(d: MetaDescriptor): Tag[] {
  const tags: Tag[] = [];
  if (typeof d.title === 'string') {
    tags.push({ kind: 'title', value: d.title });
  }
  if (typeof d.description === 'string') {
    tags.push({
      kind: 'meta',
      attrs: { name: 'description', content: d.description },
    });
  }
  if (d.meta) {
    for (const m of d.meta) tags.push({ kind: 'meta', attrs: metaAttrs(m) });
  }
  if (d.link) {
    for (const l of d.link) tags.push({ kind: 'link', attrs: linkAttrs(l) });
  }
  return tags;
}

function metaAttrs(entry: MetaEntry): Record<string, string> {
  const out: Record<string, string> = {};
  // Pull the well-known keys first so output order is predictable in
  // tests and HTML snapshots.
  if (entry.name !== undefined) out.name = entry.name;
  if (entry.property !== undefined) out.property = entry.property;
  if (entry.httpEquiv !== undefined) out['http-equiv'] = entry.httpEquiv;
  out.content = entry.content;
  for (const [k, v] of Object.entries(entry)) {
    if (k === 'name' || k === 'property' || k === 'httpEquiv' || k === 'content') continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

function linkAttrs(entry: LinkEntry): Record<string, string> {
  const out: Record<string, string> = { rel: entry.rel, href: entry.href };
  for (const [k, v] of Object.entries(entry)) {
    if (k === 'rel' || k === 'href') continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// escape helpers
// ---------------------------------------------------------------------------

// Only 5 chars are dangerous in attribute values; &, <, >, ", '. Text
// inside <title> needs &, <, > only (no quoting context).
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderAttrs(attrs: Record<string, string>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    parts.push(`${k}="${escapeAttr(v)}"`);
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

function renderTag(tag: Tag): string {
  if (tag.kind === 'title') return `<title>${escapeText(tag.value)}</title>`;
  if (tag.kind === 'meta') return `<meta${renderAttrs(tag.attrs)}>`;
  return `<link${renderAttrs(tag.attrs)}>`;
}

// ---------------------------------------------------------------------------
// registry interface
// ---------------------------------------------------------------------------

export interface MetaRegistry {
  /**
   * Register a descriptor; returns a cleanup that undoes the
   * registration. Callers of `useMeta` never invoke this directly — the
   * hook wires cleanup into the current scope.
   */
  register(descriptor: MetaDescriptor): () => void;
}

// ---------------------------------------------------------------------------
// collect registry (server)
// ---------------------------------------------------------------------------

interface CollectEntry {
  id: number;
  tags: Tag[];
}

/**
 * Server-side registry. Records registrations in call order and
 * serialises to an HTML string at the end of the render. Deduplication
 * is a last-writer-wins pass — for each dedup key, only the most-recent
 * registration's entry for that key is emitted, and it's emitted at the
 * position of the last writer.
 */
export function createCollectMetaRegistry(): MetaRegistry & {
  serialize(): string;
} {
  const entries: CollectEntry[] = [];
  let nextId = 1;
  return {
    register(descriptor) {
      const id = nextId++;
      entries.push({ id, tags: descriptorToTags(descriptor) });
      return () => {
        const idx = entries.findIndex((e) => e.id === id);
        if (idx >= 0) entries.splice(idx, 1);
      };
    },
    serialize() {
      const flat: Tag[] = [];
      for (const entry of entries) flat.push(...entry.tags);

      // Find the last index for each dedup key. A tag is emitted if it
      // has no dedup key OR its index is the last-seen index for its key.
      const lastByKey = new Map<string, number>();
      for (let i = 0; i < flat.length; i++) {
        const key = dedupKey(flat[i]);
        if (key !== null) lastByKey.set(key, i);
      }

      const out: string[] = [];
      for (let i = 0; i < flat.length; i++) {
        const key = dedupKey(flat[i]);
        if (key !== null && lastByKey.get(key) !== i) continue;
        out.push(renderTag(flat[i]));
      }
      return out.join('');
    },
  };
}

// ---------------------------------------------------------------------------
// DOM registry (client)
// ---------------------------------------------------------------------------

/**
 * Marker attribute on tags we manage. Anything in `<head>` without it
 * (e.g. the static `<meta charset>` the template shipped) is left
 * alone.
 */
export const MANAGED_ATTR = 'data-mikata-head';

interface StackEntry {
  el: HTMLElement;
  /** Dedup key the entry was filed under, or null for unkeyed tags. */
  key: string | null;
}

/**
 * Client-side registry. Each register call appends DOM elements to
 * `target` (typically `document.head`). Keyed tags share a per-key
 * stack: only the top of the stack is attached; earlier-attached
 * elements are detached but retained so pop-on-cleanup can restore them.
 */
export function createDomMetaRegistry(target: HTMLElement): MetaRegistry {
  const doc = target.ownerDocument;
  // Live tag for each dedup key. When a registration supersedes a prior
  // one, the prior element is detached but retained in `keyStacks` so
  // we can re-attach it when the supersede's cleanup fires.
  const keyStacks = new Map<string, HTMLElement[]>();

  function buildEl(tag: Tag): HTMLElement {
    if (tag.kind === 'title') {
      const el = doc.createElement('title');
      el.textContent = tag.value;
      el.setAttribute(MANAGED_ATTR, '');
      return el;
    }
    const el = doc.createElement(tag.kind);
    for (const [k, v] of Object.entries(tag.attrs)) el.setAttribute(k, v);
    el.setAttribute(MANAGED_ATTR, '');
    return el;
  }

  return {
    register(descriptor) {
      const tags = descriptorToTags(descriptor);
      const owned: StackEntry[] = [];

      for (const tag of tags) {
        const el = buildEl(tag);
        const key = dedupKey(tag);
        if (key !== null) {
          const stack = keyStacks.get(key) ?? [];
          // Detach the currently-live top, if any. It stays in the
          // stack so cleanup can re-attach it.
          const prevTop = stack[stack.length - 1];
          if (prevTop && prevTop.parentNode) prevTop.parentNode.removeChild(prevTop);
          stack.push(el);
          keyStacks.set(key, stack);
        }
        target.appendChild(el);
        owned.push({ el, key });
      }

      let disposed = false;
      const dispose = () => {
        if (disposed) return;
        disposed = true;
        // Pop entries in reverse order they were pushed, so the stack
        // semantics hold up regardless of register-order across scopes.
        for (let i = owned.length - 1; i >= 0; i--) {
          const { el, key } = owned[i];
          if (el.parentNode) el.parentNode.removeChild(el);
          if (key !== null) {
            const stack = keyStacks.get(key);
            if (stack) {
              const idx = stack.lastIndexOf(el);
              if (idx >= 0) stack.splice(idx, 1);
              // If we removed the live top and there's a prior entry,
              // re-attach it so the key always has exactly one node in
              // the DOM when any owner remains.
              if (idx === stack.length) {
                const restore = stack[stack.length - 1];
                if (restore && !restore.parentNode) target.appendChild(restore);
              }
              if (stack.length === 0) keyStacks.delete(key);
            }
          }
        }
      };
      // When called inside a reactive scope (the real use case from
      // useMeta), wire cleanup so navigating away removes the tags.
      // Standalone callers (tests, custom hosts) just get the dispose
      // function back and handle it themselves.
      if (getCurrentScope()) onCleanup(dispose);
      return dispose;
    },
  };
}

// ---------------------------------------------------------------------------
// context wiring
// ---------------------------------------------------------------------------

/**
 * A no-op registry used as the default when no provider is installed —
 * lets `useMeta()` calls in standalone tests / component harnesses
 * silently succeed rather than throw.
 */
const NOOP_REGISTRY: MetaRegistry = {
  register: () => () => {},
};

const MetaRegistryContext = createContext<MetaRegistry>(NOOP_REGISTRY);

/**
 * Install a registry for the current scope. Called by `@mikata/kit`'s
 * server and client entries; reach for it only when embedding kit in
 * a custom host.
 */
export function provideMetaRegistry(registry: MetaRegistry): void {
  provide(MetaRegistryContext, registry);
}

/**
 * Register head tags owned by the current scope. Static descriptors
 * are registered once; a function form re-evaluates inside an `effect`
 * so reactive values reissue tags whenever their deps change. The tags
 * are removed when the scope disposes (or, for the reactive form, when
 * the effect re-runs with new values).
 */
export function useMeta(input: MetaInput): void {
  const registry = inject(MetaRegistryContext);
  if (typeof input === 'function') {
    // Reactive form: rebuild registration on signal change. We manage
    // the previous registration's dispose manually so scope-teardown
    // doesn't remove entries before a one-shot server render has had
    // a chance to serialize them. The DOM registry wires its own
    // onCleanup for scope-based removal on the client.
    let prev: (() => void) | null = null;
    effect(() => {
      if (prev) prev();
      prev = registry.register(input());
    });
  } else {
    registry.register(input);
  }
}
