/**
 * Mikata DevTools — in-page debugging overlay + console API.
 *
 * Installs window.__MIKATA_DEVTOOLS__ for console-based inspection
 * and renders a floating panel showing reactive state at a glance.
 *
 * Only activated in dev mode. Zero cost in production.
 */

import {
  getGraphSnapshot,
  getStats,
  findNodeById,
  traceDependencies,
  traceSubscribers,
  getNodesByKind,
  findNodesByLabel,
  type ReactiveGraphSnapshot,
  type DebugNodeSnapshot,
  type NodeKind,
} from '@mikata/reactivity';

declare const __DEV__: boolean;

// ---------------------------------------------------------------------------
// Component tree tracking
// ---------------------------------------------------------------------------

export interface ComponentTreeNode {
  name: string;
  node: Node;
  children: ComponentTreeNode[];
  parent: ComponentTreeNode | null;
  /** performance.now() at mount. */
  mountedAt: number;
}

let rootComponents: ComponentTreeNode[] = [];
const nodeToComponent = new WeakMap<Node, ComponentTreeNode>();

/**
 * Register a component instance in the tree. Called by _createComponent.
 */
export function trackComponent(name: string, domNode: Node, parentNode?: Node): void {
  const entry: ComponentTreeNode = {
    name,
    node: domNode,
    children: [],
    parent: null,
    mountedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
  };

  if (parentNode) {
    const parentComp = nodeToComponent.get(parentNode);
    if (parentComp) {
      entry.parent = parentComp;
      parentComp.children.push(entry);
    } else {
      rootComponents.push(entry);
    }
  } else {
    rootComponents.push(entry);
  }

  nodeToComponent.set(domNode, entry);
}

/**
 * Unregister a component when disposed.
 */
export function untrackComponent(domNode: Node): void {
  const entry = nodeToComponent.get(domNode);
  if (!entry) return;

  if (entry.parent) {
    const idx = entry.parent.children.indexOf(entry);
    if (idx !== -1) entry.parent.children.splice(idx, 1);
  } else {
    const idx = rootComponents.indexOf(entry);
    if (idx !== -1) rootComponents.splice(idx, 1);
  }

  nodeToComponent.delete(domNode);
}

interface ComponentTreeSnapshot {
  name: string;
  children: ComponentTreeSnapshot[];
  inDOM: boolean;
  /** Live reference to the DOM node — used for hover/highlight. */
  domNode: Node;
  mountedAt: number;
}

function getComponentTree(): ComponentTreeSnapshot[] {
  return rootComponents.map(snapshotComponentTree);
}

function snapshotComponentTree(entry: ComponentTreeNode): ComponentTreeSnapshot {
  return {
    name: entry.name,
    inDOM: !!entry.node.parentNode || (entry.node as ChildNode).isConnected,
    children: entry.children.map(snapshotComponentTree),
    domNode: entry.node,
    mountedAt: entry.mountedAt,
  };
}

/** Walk up from any DOM node looking for a tracked component root. */
function findComponentForElement(el: Node | null): ComponentTreeNode | null {
  let cur: Node | null = el;
  while (cur) {
    const entry = nodeToComponent.get(cur);
    if (entry) return entry;
    cur = cur.parentNode;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Console API — window.__MIKATA_DEVTOOLS__
// ---------------------------------------------------------------------------

export interface MikataDevTools {
  /** Snapshot the full reactive dependency graph */
  graph(): ReactiveGraphSnapshot;
  /** Quick stats: signal/computed/effect counts, how many dirty */
  stats(): ReturnType<typeof getStats>;
  /** Inspect a specific node by ID */
  inspect(id: number): DebugNodeSnapshot | undefined;
  /** Trace what a node depends on (transitively) */
  why(id: number): DebugNodeSnapshot[];
  /** Trace what depends on a node (transitively) */
  subscribers(id: number): DebugNodeSnapshot[];
  /** Get all nodes of a specific kind */
  list(kind: NodeKind): DebugNodeSnapshot[];
  /** Search nodes by label */
  search(query: string): DebugNodeSnapshot[];
  /** Get the component tree */
  components(): ComponentTreeSnapshot[];
  /** Find the component owning a DOM element (walks up until a tracked node is hit). */
  findComponent(el: Element): { name: string; node: Node } | null;
  /** Show/hide the overlay panel */
  show(): void;
  hide(): void;
  toggle(): void;
  /** Version */
  version: string;
}

function createDevToolsAPI(): MikataDevTools {
  return {
    graph: getGraphSnapshot,
    stats: getStats,
    inspect: findNodeById,
    why: traceDependencies,
    subscribers: traceSubscribers,
    list: getNodesByKind,
    search: findNodesByLabel,
    components: getComponentTree,
    findComponent(el) {
      const entry = findComponentForElement(el);
      return entry ? { name: entry.name, node: entry.node } : null;
    },
    show: () => showOverlay(),
    hide: () => hideOverlay(),
    toggle: () => toggleOverlay(),
    version: '0.1.0',
  };
}

// ---------------------------------------------------------------------------
// Panel state
// ---------------------------------------------------------------------------

let overlayEl: HTMLElement | null = null;
let overlayVisible = false;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const expandedNodes = new Set<number>();
const activeTab = { current: 'overview' as 'overview' | 'signals' | 'effects' | 'components' };
const filter = { query: '', ownerOnly: false };
let paused = false;
let pickerActive = false;
let highlightEl: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLES = `
  #__mikata-devtools__ {
    position: fixed;
    bottom: 16px;
    right: 16px;
    width: 520px;
    height: 520px;
    background: #1a1a2e;
    color: #e0e0e0;
    border: 1px solid #333;
    border-radius: 10px;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    z-index: 2147483646;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  #__mikata-devtools__ * { box-sizing: border-box; }
  #__mikata-devtools__ button {
    font-family: inherit;
  }
  .__mdt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #16213e;
    border-bottom: 1px solid #333;
    cursor: move;
    flex-shrink: 0;
  }
  .__mdt-title {
    font-weight: 600;
    font-size: 13px;
    color: #7ec8e3;
    user-select: none;
  }
  .__mdt-btns { display: flex; gap: 4px; }
  .__mdt-btn {
    background: none;
    border: 1px solid #444;
    color: #aaa;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
  }
  .__mdt-btn:hover { background: #333; color: #fff; }
  .__mdt-btn.active { background: #7ec8e3; color: #16213e; border-color: #7ec8e3; }
  .__mdt-tab-bar {
    display: flex;
    border-bottom: 1px solid #333;
    background: #16213e;
    overflow-x: auto;
    flex-shrink: 0;
  }
  .__mdt-tab-bar::-webkit-scrollbar { height: 0; }
  .__mdt-tab {
    padding: 6px 14px;
    cursor: pointer;
    color: #888;
    font-size: 11px;
    border: none;
    background: none;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .__mdt-tab.active { color: #7ec8e3; border-bottom-color: #7ec8e3; }
  .__mdt-tab:hover { color: #ccc; }
  .__mdt-toolbar {
    display: flex;
    gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid #222;
    background: #121828;
    flex-shrink: 0;
    align-items: center;
  }
  .__mdt-toolbar input {
    flex: 1;
    background: #0e1322;
    border: 1px solid #2a3142;
    border-radius: 4px;
    color: #e0e0e0;
    padding: 4px 8px;
    font-size: 11px;
    font-family: inherit;
    outline: none;
  }
  .__mdt-toolbar input:focus { border-color: #7ec8e3; }
  .__mdt-content {
    padding: 10px 12px;
    overflow-y: auto;
    flex: 1;
  }
  .__mdt-section { margin-bottom: 12px; }
  .__mdt-section-title {
    font-weight: 600;
    color: #7ec8e3;
    margin-bottom: 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .__mdt-stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .__mdt-stat {
    background: #16213e;
    padding: 6px 8px;
    border-radius: 6px;
    text-align: center;
  }
  .__mdt-stat-value {
    font-size: 18px;
    font-weight: 700;
    color: #7ec8e3;
  }
  .__mdt-stat-label {
    font-size: 9px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .__mdt-node {
    padding: 5px 8px;
    border-radius: 4px;
    margin-bottom: 2px;
    cursor: pointer;
    border: 1px solid transparent;
  }
  .__mdt-node:hover { background: #16213e; border-color: #222c44; }
  .__mdt-node.expanded { background: #0f1628; border-color: #2a3142; }
  .__mdt-node-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .__mdt-node-left {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }
  .__mdt-node-label {
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .__mdt-node-owner {
    color: #f0db4f;
    font-size: 10px;
    margin-left: 4px;
  }
  .__mdt-node-value {
    color: #7ec8e3;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
  }
  .__mdt-meta {
    display: flex;
    gap: 10px;
    color: #666;
    font-size: 10px;
    margin-top: 3px;
  }
  .__mdt-dirty { color: #e74c3c; font-weight: 700; font-size: 10px; }
  .__mdt-node-detail {
    margin-top: 8px;
    padding: 8px;
    background: #0a0f1d;
    border-radius: 4px;
    font-size: 10px;
    color: #aaa;
    line-height: 1.5;
    white-space: pre-wrap;
    border-left: 2px solid #7ec8e3;
  }
  .__mdt-detail-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }
  .__mdt-detail-label {
    color: #7ec8e3;
    font-weight: 600;
    min-width: 72px;
  }
  .__mdt-chip {
    background: #16213e;
    border: 1px solid #2a3142;
    color: #ccc;
    padding: 1px 6px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
  }
  .__mdt-chip:hover { border-color: #7ec8e3; color: #fff; }
  .__mdt-badge {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 9px;
    font-weight: 600;
    margin-right: 2px;
  }
  .__mdt-badge-signal { background: #1a472a; color: #4ade80; }
  .__mdt-badge-computed { background: #1a3a4a; color: #38bdf8; }
  .__mdt-badge-effect { background: #3a2a1a; color: #fb923c; }
  .__mdt-badge-render { background: #3a1a3a; color: #c084fc; }
  .__mdt-tree-node {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px;
    cursor: pointer;
    border-radius: 3px;
    color: #ccc;
    font-size: 11px;
  }
  .__mdt-tree-node:hover { background: #16213e; }
  .__mdt-tree-name { color: #f0db4f; }
  .__mdt-tree-count {
    color: #666;
    font-size: 10px;
  }
  .__mdt-empty {
    color: #666;
    font-style: italic;
    padding: 8px 0;
  }
  .__mdt-resize {
    position: absolute;
    left: 0;
    top: 0;
    width: 10px;
    height: 10px;
    cursor: nwse-resize;
  }
  #__mikata-highlight {
    position: fixed;
    pointer-events: none;
    z-index: 2147483645;
    background: rgba(126, 200, 227, 0.18);
    border: 2px solid #7ec8e3;
    border-radius: 2px;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0);
    transition: all 80ms ease-out;
  }
  #__mikata-highlight-label {
    position: absolute;
    top: -22px;
    left: 0;
    background: #7ec8e3;
    color: #16213e;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 700;
    font-family: 'SF Mono', 'Fira Code', monospace;
    white-space: nowrap;
  }
`;

// ---------------------------------------------------------------------------
// Overlay construction
// ---------------------------------------------------------------------------

function createOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = '__mikata-devtools__';
  overlay.innerHTML = `
    <style>${STYLES}</style>
    <div class="__mdt-resize"></div>
    <div class="__mdt-header">
      <span class="__mdt-title">Mikata DevTools</span>
      <div class="__mdt-btns">
        <button class="__mdt-btn" id="__mdt-pick" title="Inspect element — click a DOM node to find its component">Pick</button>
        <button class="__mdt-btn" id="__mdt-pause" title="Pause auto-refresh (every 500ms)">Pause</button>
        <button class="__mdt-btn" id="__mdt-close" aria-label="Close">X</button>
      </div>
    </div>
    <div class="__mdt-tab-bar">
      <button class="__mdt-tab active" data-tab="overview">Overview</button>
      <button class="__mdt-tab" data-tab="signals">Signals</button>
      <button class="__mdt-tab" data-tab="effects">Effects</button>
      <button class="__mdt-tab" data-tab="components">Components</button>
    </div>
    <div class="__mdt-toolbar" id="__mdt-toolbar" style="display:none">
      <input id="__mdt-search" placeholder="Filter by label or owner…" type="text" />
    </div>
    <div class="__mdt-content" id="__mdt-body"></div>
  `;

  overlay.querySelector('#__mdt-close')!.addEventListener('click', hideOverlay);
  overlay.querySelector('#__mdt-pause')!.addEventListener('click', (e) => {
    paused = !paused;
    (e.currentTarget as HTMLElement).classList.toggle('active', paused);
    (e.currentTarget as HTMLElement).textContent = paused ? 'Resume' : 'Pause';
  });
  overlay.querySelector('#__mdt-pick')!.addEventListener('click', (e) => {
    togglePicker(e.currentTarget as HTMLElement);
  });

  const tabs = overlay.querySelectorAll('.__mdt-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab.current = (tab as HTMLElement).dataset.tab as typeof activeTab.current;
      expandedNodes.clear();
      refreshContent();
    });
  });

  const searchInput = overlay.querySelector('#__mdt-search') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    filter.query = searchInput.value.toLowerCase();
    refreshContent();
  });

  makeDraggable(overlay);
  makeResizable(overlay);

  return overlay;
}

function makeDraggable(el: HTMLElement): void {
  const header = el.querySelector('.__mdt-header') as HTMLElement;
  let isDragging = false;
  let startX = 0, startY = 0;
  let startRight = 0, startBottom = 0;

  header.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.__mdt-btn')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    startRight = window.innerWidth - rect.right;
    startBottom = window.innerHeight - rect.bottom;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.style.right = `${Math.max(0, startRight - dx)}px`;
    el.style.bottom = `${Math.max(0, startBottom - dy)}px`;
  });
  document.addEventListener('mouseup', () => { isDragging = false; });
}

function makeResizable(el: HTMLElement): void {
  const handle = el.querySelector('.__mdt-resize') as HTMLElement;
  let resizing = false;
  let startX = 0, startY = 0, startW = 0, startH = 0;
  handle.addEventListener('mousedown', (e: MouseEvent) => {
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;
    e.preventDefault();
    e.stopPropagation();
  });
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!resizing) return;
    const dw = startX - e.clientX;
    const dh = startY - e.clientY;
    el.style.width = `${Math.max(360, startW + dw)}px`;
    el.style.height = `${Math.max(300, startH + dh)}px`;
  });
  document.addEventListener('mouseup', () => { resizing = false; });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function refreshContent(): void {
  if (!overlayEl || paused) return;
  const body = overlayEl.querySelector('#__mdt-body') as HTMLElement;
  const toolbar = overlayEl.querySelector('#__mdt-toolbar') as HTMLElement;
  if (!body) return;

  const showToolbar = activeTab.current === 'signals' || activeTab.current === 'effects';
  toolbar.style.display = showToolbar ? 'flex' : 'none';

  switch (activeTab.current) {
    case 'overview': renderOverview(body); break;
    case 'signals': renderNodes(body, 'signals'); break;
    case 'effects': renderNodes(body, 'effects'); break;
    case 'components': renderComponentTree(body); break;
  }
}

function renderOverview(body: HTMLElement): void {
  const stats = getStats();
  const graph = getGraphSnapshot();

  // Top slowest effects (by lastRunMs)
  const allEffects = [...graph.effects, ...graph.renderEffects]
    .filter((e) => e.lastRunMs != null)
    .sort((a, b) => (b.lastRunMs ?? 0) - (a.lastRunMs ?? 0))
    .slice(0, 5);

  // Most-updated signals
  const allSignals = [...graph.signals, ...graph.computeds]
    .sort((a, b) => b.updateCount - a.updateCount)
    .slice(0, 5);

  body.innerHTML = `
    <div class="__mdt-section">
      <div class="__mdt-section-title">Reactive Nodes</div>
      <div class="__mdt-stat-grid">
        <div class="__mdt-stat"><div class="__mdt-stat-value">${stats.signals}</div><div class="__mdt-stat-label">Signals</div></div>
        <div class="__mdt-stat"><div class="__mdt-stat-value">${stats.computeds}</div><div class="__mdt-stat-label">Computed</div></div>
        <div class="__mdt-stat"><div class="__mdt-stat-value">${stats.effects}</div><div class="__mdt-stat-label">Effects</div></div>
        <div class="__mdt-stat"><div class="__mdt-stat-value">${stats.renderEffects}</div><div class="__mdt-stat-label">Render Fx</div></div>
        <div class="__mdt-stat"><div class="__mdt-stat-value">${countComponents()}</div><div class="__mdt-stat-label">Components</div></div>
        <div class="__mdt-stat"><div class="__mdt-stat-value" style="color:${stats.dirty > 0 ? '#e74c3c' : '#4ade80'}">${stats.dirty}</div><div class="__mdt-stat-label">Dirty</div></div>
      </div>
    </div>
    <div class="__mdt-section">
      <div class="__mdt-section-title">Slowest effects</div>
      ${allEffects.length === 0
        ? '<div class="__mdt-empty">No effect runs recorded yet</div>'
        : allEffects.map((e) => `
          <div class="__mdt-node">
            <div class="__mdt-node-row">
              <div class="__mdt-node-left">
                <span class="__mdt-badge ${e.kind === 'effect' ? '__mdt-badge-effect' : '__mdt-badge-render'}">${e.kind === 'effect' ? 'FX' : 'RFX'}</span>
                <span class="__mdt-node-label">${escapeHtml(e.label ?? `#${e.id}`)}</span>
                ${e.owner ? `<span class="__mdt-node-owner">in &lt;${escapeHtml(e.owner.label)} /&gt;</span>` : ''}
              </div>
              <span class="__mdt-node-value">${formatMs(e.lastRunMs)}</span>
            </div>
          </div>`).join('')}
    </div>
    <div class="__mdt-section">
      <div class="__mdt-section-title">Most updated signals</div>
      ${allSignals.length === 0
        ? '<div class="__mdt-empty">No signal updates recorded</div>'
        : allSignals.map((n) => `
          <div class="__mdt-node">
            <div class="__mdt-node-row">
              <div class="__mdt-node-left">
                <span class="__mdt-badge ${n.kind === 'signal' ? '__mdt-badge-signal' : '__mdt-badge-computed'}">${n.kind === 'signal' ? 'SIG' : 'CMP'}</span>
                <span class="__mdt-node-label">${escapeHtml(n.label ?? `#${n.id}`)}</span>
                ${n.owner ? `<span class="__mdt-node-owner">in &lt;${escapeHtml(n.owner.label)} /&gt;</span>` : ''}
              </div>
              <span class="__mdt-node-value">${n.updateCount}× changes</span>
            </div>
          </div>`).join('')}
    </div>
    <div class="__mdt-section">
      <div class="__mdt-section-title">Console API</div>
      <div style="color:#888;font-size:11px;line-height:1.55">
        <code style="color:#7ec8e3">__MIKATA_DEVTOOLS__.graph()</code> — full graph<br>
        <code style="color:#7ec8e3">.inspect(id)</code> — node details<br>
        <code style="color:#7ec8e3">.why(id)</code> / <code style="color:#7ec8e3">.subscribers(id)</code> — dependency chain<br>
        <code style="color:#7ec8e3">.search("label")</code> — find by label<br>
        <code style="color:#7ec8e3">.findComponent(el)</code> — DOM element → component
      </div>
    </div>
  `;
}

function renderNodes(body: HTMLElement, which: 'signals' | 'effects'): void {
  const graph = getGraphSnapshot();
  const all = which === 'signals'
    ? [...graph.signals, ...graph.computeds]
    : [...graph.effects, ...graph.renderEffects];

  const visible = all.filter((n) => matchesFilter(n));
  if (visible.length === 0) {
    body.innerHTML = `<div class="__mdt-empty">No ${which === 'signals' ? 'signals or computed values' : 'effects'} ${filter.query ? 'match the filter' : ''}</div>`;
    return;
  }

  body.innerHTML = visible.map((n) => renderNodeRow(n, which)).join('');

  body.querySelectorAll<HTMLElement>('.__mdt-node').forEach((el) => {
    const id = Number(el.dataset.id);
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.__mdt-chip')) return;
      if (expandedNodes.has(id)) expandedNodes.delete(id);
      else expandedNodes.add(id);
      refreshContent();
    });
  });
  body.querySelectorAll<HTMLElement>('.__mdt-chip[data-nav]').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = Number((chip as HTMLElement).dataset.nav);
      const node = findNodeById(target);
      if (!node) return;
      activeTab.current =
        node.kind === 'signal' || node.kind === 'computed' ? 'signals' : 'effects';
      overlayEl?.querySelectorAll('.__mdt-tab').forEach((t) => {
        t.classList.toggle('active', (t as HTMLElement).dataset.tab === activeTab.current);
      });
      expandedNodes.clear();
      expandedNodes.add(target);
      refreshContent();
    });
  });
}

function renderNodeRow(n: DebugNodeSnapshot, which: 'signals' | 'effects'): string {
  const expanded = expandedNodes.has(n.id);
  const badge =
    n.kind === 'signal' ? '__mdt-badge-signal' :
    n.kind === 'computed' ? '__mdt-badge-computed' :
    n.kind === 'effect' ? '__mdt-badge-effect' : '__mdt-badge-render';
  const badgeText =
    n.kind === 'signal' ? 'SIG' : n.kind === 'computed' ? 'CMP' :
    n.kind === 'effect' ? 'FX' : 'RFX';

  const primaryValue = which === 'signals'
    ? formatValue(n.value)
    : `${n.sourceCount} dep${n.sourceCount !== 1 ? 's' : ''}`;

  const meta: string[] = [];
  if (n.updateCount > 0) meta.push(`${n.updateCount}× changed`);
  if (n.lastChangedAt > 0) meta.push(`${timeSince(n.lastChangedAt)} ago`);
  if (n.lastRunMs != null) meta.push(`last ${formatMs(n.lastRunMs)}`);
  if (n.totalRunMs != null) meta.push(`total ${formatMs(n.totalRunMs)}`);
  meta.push(`${n.subscriberCount} subs`);

  return `
    <div class="__mdt-node ${expanded ? 'expanded' : ''}" data-id="${n.id}">
      <div class="__mdt-node-row">
        <div class="__mdt-node-left">
          <span class="__mdt-badge ${badge}">${badgeText}</span>
          <span class="__mdt-node-label">${escapeHtml(n.label ?? `#${n.id}`)}</span>
          ${n.owner ? `<span class="__mdt-node-owner">in &lt;${escapeHtml(n.owner.label)} /&gt;</span>` : ''}
          ${n.dirty ? '<span class="__mdt-dirty"> dirty</span>' : ''}
        </div>
        <span class="__mdt-node-value">${primaryValue}</span>
      </div>
      <div class="__mdt-meta">${meta.join(' · ')}</div>
      ${expanded ? renderNodeDetail(n) : ''}
    </div>`;
}

function renderNodeDetail(n: DebugNodeSnapshot): string {
  const sources = n.sources.map((id) => {
    const src = findNodeById(id);
    return src
      ? `<span class="__mdt-chip" data-nav="${id}">${escapeHtml(src.label ?? `#${id}`)}</span>`
      : `<span class="__mdt-chip">#${id}</span>`;
  }).join(' ');
  const subs = n.subscribers.map((id) => {
    const sub = findNodeById(id);
    return sub
      ? `<span class="__mdt-chip" data-nav="${id}">${escapeHtml(sub.label ?? `#${id}`)}</span>`
      : `<span class="__mdt-chip">#${id}</span>`;
  }).join(' ');

  return `
    <div class="__mdt-node-detail">
      <div class="__mdt-detail-row"><span class="__mdt-detail-label">id</span>#${n.id}</div>
      <div class="__mdt-detail-row"><span class="__mdt-detail-label">version</span>${n.version}</div>
      ${n.value !== undefined ? `<div class="__mdt-detail-row"><span class="__mdt-detail-label">value</span>${escapeHtml(formatValueFull(n.value))}</div>` : ''}
      <div class="__mdt-detail-row"><span class="__mdt-detail-label">sources</span>${sources || '<em style="color:#555">none</em>'}</div>
      <div class="__mdt-detail-row"><span class="__mdt-detail-label">subscribers</span>${subs || '<em style="color:#555">none</em>'}</div>
      <div class="__mdt-detail-row"><span class="__mdt-detail-label">created</span><pre style="margin:0;font-size:10px;color:#888;max-height:80px;overflow:auto">${escapeHtml(n.createdAt)}</pre></div>
    </div>`;
}

function matchesFilter(n: DebugNodeSnapshot): boolean {
  if (!filter.query) return true;
  const q = filter.query;
  if (n.label?.toLowerCase().includes(q)) return true;
  if (n.owner?.label.toLowerCase().includes(q)) return true;
  if (String(n.id) === q) return true;
  return false;
}

function renderComponentTree(body: HTMLElement): void {
  const tree = getComponentTree();
  if (tree.length === 0) {
    body.innerHTML = '<div class="__mdt-empty">No components mounted</div>';
    return;
  }
  body.innerHTML = tree.map((t) => renderTreeNode(t, 0)).join('');
  body.querySelectorAll<HTMLElement>('.__mdt-tree-node').forEach((el) => {
    const ref = el.dataset.ref;
    if (!ref) return;
    const entry = treeIndex[Number(ref)];
    if (!entry) return;
    el.addEventListener('mouseenter', () => highlightNode(entry.domNode));
    el.addEventListener('mouseleave', () => clearHighlight());
    el.addEventListener('click', () => {
      const el2 = entry.domNode as Element;
      console.log('[mikata:devtools] <' + entry.name + ' />', el2);
      if (el2.scrollIntoView) el2.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

const treeIndex: Record<number, ComponentTreeSnapshot> = {};
function renderTreeNode(node: ComponentTreeSnapshot, depth: number): string {
  const ref = Object.keys(treeIndex).length;
  treeIndex[ref] = node;
  const ownedCounts = countOwnedNodes(node.name);
  const counts = ownedCounts.signals + ownedCounts.effects > 0
    ? ` <span class="__mdt-tree-count">${ownedCounts.signals}s · ${ownedCounts.effects}fx</span>`
    : '';
  const dimmed = !node.inDOM ? ' style="opacity: 0.4"' : '';
  const children = node.children.map((c) => renderTreeNode(c, depth + 1)).join('');
  return `
    <div class="__mdt-tree-node" data-ref="${ref}" style="padding-left:${depth * 16}px"${dimmed ? '' : ''}>
      <span class="__mdt-tree-name">&lt;${escapeHtml(node.name)} /&gt;</span>${counts}
      ${!node.inDOM ? '<span style="color:#666;font-size:10px">(unmounted)</span>' : ''}
    </div>
    ${children}`;
}

function countOwnedNodes(componentLabel: string): { signals: number; effects: number } {
  const graph = getGraphSnapshot();
  let signals = 0, effects = 0;
  for (const n of graph.signals) if (n.owner?.label === componentLabel) signals++;
  for (const n of graph.computeds) if (n.owner?.label === componentLabel) signals++;
  for (const n of graph.effects) if (n.owner?.label === componentLabel) effects++;
  for (const n of graph.renderEffects) if (n.owner?.label === componentLabel) effects++;
  return { signals, effects };
}

function countComponents(): number {
  let count = 0;
  function walk(nodes: ComponentTreeNode[]) {
    for (const n of nodes) { count++; walk(n.children); }
  }
  walk(rootComponents);
  return count;
}

// ---------------------------------------------------------------------------
// Element highlighting + picker
// ---------------------------------------------------------------------------

function highlightNode(node: Node, label?: string): void {
  clearHighlight();
  const el = node as Element;
  if (!el || !el.getBoundingClientRect) return;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;
  const hl = document.createElement('div');
  hl.id = '__mikata-highlight';
  hl.style.left = `${rect.left}px`;
  hl.style.top = `${rect.top}px`;
  hl.style.width = `${rect.width}px`;
  hl.style.height = `${rect.height}px`;
  if (label) {
    const lbl = document.createElement('div');
    lbl.id = '__mikata-highlight-label';
    lbl.textContent = label;
    hl.appendChild(lbl);
  }
  document.body.appendChild(hl);
  highlightEl = hl;
}

function clearHighlight(): void {
  if (highlightEl && highlightEl.parentNode) {
    highlightEl.parentNode.removeChild(highlightEl);
  }
  highlightEl = null;
}

function togglePicker(btn: HTMLElement): void {
  pickerActive = !pickerActive;
  btn.classList.toggle('active', pickerActive);
  btn.textContent = pickerActive ? 'Picking…' : 'Pick';
  if (pickerActive) {
    document.addEventListener('mousemove', onPickerMove, true);
    document.addEventListener('click', onPickerClick, true);
    document.addEventListener('keydown', onPickerKey, true);
  } else {
    document.removeEventListener('mousemove', onPickerMove, true);
    document.removeEventListener('click', onPickerClick, true);
    document.removeEventListener('keydown', onPickerKey, true);
    clearHighlight();
  }
}

function onPickerMove(e: MouseEvent): void {
  const target = e.target as Element | null;
  if (!target || overlayEl?.contains(target)) { clearHighlight(); return; }
  const entry = findComponentForElement(target);
  if (!entry) { clearHighlight(); return; }
  highlightNode(entry.node, '<' + entry.name + ' />');
}

function onPickerClick(e: MouseEvent): void {
  const target = e.target as Element | null;
  if (overlayEl?.contains(target)) return;
  e.preventDefault();
  e.stopPropagation();
  const entry = findComponentForElement(target);
  if (entry) {
    console.log('[mikata:devtools] picked <' + entry.name + ' />', entry.node);
  } else {
    console.log('[mikata:devtools] no Mikata component found at', target);
  }
  const btn = overlayEl?.querySelector('#__mdt-pick') as HTMLElement;
  if (btn) togglePicker(btn);
}

function onPickerKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    const btn = overlayEl?.querySelector('#__mdt-pick') as HTMLElement;
    if (btn) togglePicker(btn);
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatValue(value: unknown): string {
  if (value === undefined) return '<span style="color:#666">undefined</span>';
  if (value === null) return '<span style="color:#666">null</span>';
  if (typeof value === 'string') return `"${escapeHtml(value.length > 40 ? value.slice(0, 40) + '…' : value)}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'function') return '<span style="color:#c084fc">ƒ</span>';
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return `{${Object.keys(value as object).length}}`;
  return String(value);
}

function formatValueFull(value: unknown): string {
  try {
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return String((value as { name?: string }).name ?? 'ƒ');
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatMs(ms: number | undefined): string {
  if (ms == null) return '—';
  if (ms < 0.05) return '<0.1ms';
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  return `${Math.round(ms)}ms`;
}

function timeSince(t: number): string {
  const delta = performance.now() - t;
  if (delta < 1000) return `${Math.round(delta)}ms`;
  if (delta < 60_000) return `${(delta / 1000).toFixed(1)}s`;
  return `${Math.round(delta / 60_000)}m`;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Show / hide / toggle
// ---------------------------------------------------------------------------

function showOverlay(): void {
  if (!overlayEl) overlayEl = createOverlay();
  document.body.appendChild(overlayEl);
  overlayVisible = true;
  refreshContent();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshContent, 500);
}

function hideOverlay(): void {
  if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  overlayVisible = false;
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  clearHighlight();
}

function toggleOverlay(): void {
  if (overlayVisible) hideOverlay();
  else showOverlay();
}

// ---------------------------------------------------------------------------
// Install devtools
// ---------------------------------------------------------------------------

export function installDevTools(options?: { overlay?: boolean }): void {
  if (typeof window === 'undefined') return;

  const api = createDevToolsAPI();
  (window as unknown as { __MIKATA_DEVTOOLS__: MikataDevTools }).__MIKATA_DEVTOOLS__ = api;

  if (options?.overlay !== false) {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        toggleOverlay();
      }
    });
  }

  console.log(
    '%c Mikata DevTools %c Installed. Access via window.__MIKATA_DEVTOOLS__ or press Ctrl+Shift+M.',
    'background: #7ec8e3; color: #1a1a2e; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
    'color: #7ec8e3;'
  );
}
