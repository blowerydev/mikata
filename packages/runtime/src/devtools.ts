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
  };

  // Find parent component by walking up the DOM or checking the parent node
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

  // Remove from parent's children
  if (entry.parent) {
    const idx = entry.parent.children.indexOf(entry);
    if (idx !== -1) entry.parent.children.splice(idx, 1);
  } else {
    const idx = rootComponents.indexOf(entry);
    if (idx !== -1) rootComponents.splice(idx, 1);
  }

  nodeToComponent.delete(domNode);
}

function getComponentTree(): ComponentTreeSnapshot[] {
  return rootComponents.map(snapshotComponentTree);
}

interface ComponentTreeSnapshot {
  name: string;
  children: ComponentTreeSnapshot[];
  inDOM: boolean;
}

function snapshotComponentTree(entry: ComponentTreeNode): ComponentTreeSnapshot {
  return {
    name: entry.name,
    inDOM: !!entry.node.parentNode || entry.node.isConnected,
    children: entry.children.map(snapshotComponentTree),
  };
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
    show: () => showOverlay(),
    hide: () => hideOverlay(),
    toggle: () => toggleOverlay(),
    version: '0.1.0',
  };
}

// ---------------------------------------------------------------------------
// Floating overlay panel
// ---------------------------------------------------------------------------

let overlayEl: HTMLElement | null = null;
let overlayVisible = false;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function createOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = '__mikata-devtools__';
  overlay.setAttribute('data-mikata-devtools', '');

  overlay.innerHTML = `
    <style>
      #__mikata-devtools__ {
        position: fixed;
        bottom: 16px;
        right: 16px;
        width: 360px;
        max-height: 480px;
        background: #1a1a2e;
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 10px;
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
        font-size: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        z-index: 2147483647;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        user-select: none;
      }
      #__mikata-devtools__ * {
        box-sizing: border-box;
      }
      .__mdt-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #16213e;
        border-bottom: 1px solid #333;
        cursor: move;
      }
      .__mdt-title {
        font-weight: 600;
        font-size: 13px;
        color: #7ec8e3;
      }
      .__mdt-btns {
        display: flex;
        gap: 6px;
      }
      .__mdt-btn {
        background: none;
        border: 1px solid #444;
        color: #aaa;
        padding: 2px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
      }
      .__mdt-btn:hover {
        background: #333;
        color: #fff;
      }
      .__mdt-content {
        padding: 10px 12px;
        overflow-y: auto;
        flex: 1;
        max-height: 420px;
      }
      .__mdt-section {
        margin-bottom: 12px;
      }
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
        grid-template-columns: 1fr 1fr 1fr;
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
      .__mdt-node-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .__mdt-node {
        padding: 4px 8px;
        border-radius: 4px;
        margin-bottom: 2px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
      }
      .__mdt-node:hover {
        background: #16213e;
      }
      .__mdt-node-label {
        color: #ccc;
      }
      .__mdt-node-value {
        color: #7ec8e3;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .__mdt-dirty {
        color: #e74c3c;
        font-weight: 700;
        font-size: 10px;
      }
      .__mdt-tree {
        padding-left: 12px;
        border-left: 1px solid #333;
        margin-left: 4px;
      }
      .__mdt-tree-node {
        padding: 2px 0;
        color: #ccc;
        font-size: 11px;
      }
      .__mdt-tree-name {
        color: #f0db4f;
      }
      .__mdt-tab-bar {
        display: flex;
        border-bottom: 1px solid #333;
        background: #16213e;
      }
      .__mdt-tab {
        padding: 6px 12px;
        cursor: pointer;
        color: #888;
        font-size: 11px;
        border-bottom: 2px solid transparent;
        font-family: inherit;
        background: none;
        border-top: none;
        border-left: none;
        border-right: none;
      }
      .__mdt-tab.active {
        color: #7ec8e3;
        border-bottom-color: #7ec8e3;
      }
      .__mdt-tab:hover {
        color: #ccc;
      }
      .__mdt-empty {
        color: #666;
        font-style: italic;
        padding: 8px 0;
      }
      .__mdt-badge {
        display: inline-block;
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 9px;
        font-weight: 600;
        margin-right: 4px;
      }
      .__mdt-badge-signal { background: #1a472a; color: #4ade80; }
      .__mdt-badge-computed { background: #1a3a4a; color: #38bdf8; }
      .__mdt-badge-effect { background: #3a2a1a; color: #fb923c; }
      .__mdt-badge-render { background: #3a1a3a; color: #c084fc; }
    </style>
    <div class="__mdt-header">
      <span class="__mdt-title">Mikata DevTools</span>
      <div class="__mdt-btns">
        <button class="__mdt-btn" id="__mdt-refresh">Refresh</button>
        <button class="__mdt-btn" id="__mdt-close">X</button>
      </div>
    </div>
    <div class="__mdt-tab-bar">
      <button class="__mdt-tab active" data-tab="overview">Overview</button>
      <button class="__mdt-tab" data-tab="signals">Signals</button>
      <button class="__mdt-tab" data-tab="effects">Effects</button>
      <button class="__mdt-tab" data-tab="tree">Components</button>
    </div>
    <div class="__mdt-content" id="__mdt-body"></div>
  `;

  // Event listeners
  overlay.querySelector('#__mdt-close')!.addEventListener('click', hideOverlay);
  overlay.querySelector('#__mdt-refresh')!.addEventListener('click', () => refreshContent());

  const tabs = overlay.querySelectorAll('.__mdt-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      refreshContent();
    });
  });

  // Make draggable
  makeDraggable(overlay);

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

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

function getActiveTab(): string {
  if (!overlayEl) return 'overview';
  const active = overlayEl.querySelector('.__mdt-tab.active') as HTMLElement | null;
  return active?.dataset.tab ?? 'overview';
}

function refreshContent(): void {
  if (!overlayEl) return;
  const body = overlayEl.querySelector('#__mdt-body') as HTMLElement;
  if (!body) return;

  const tab = getActiveTab();

  switch (tab) {
    case 'overview':
      renderOverview(body);
      break;
    case 'signals':
      renderSignals(body);
      break;
    case 'effects':
      renderEffects(body);
      break;
    case 'tree':
      renderComponentTree(body);
      break;
  }
}

function renderOverview(body: HTMLElement): void {
  const stats = getStats();

  body.innerHTML = `
    <div class="__mdt-section">
      <div class="__mdt-section-title">Reactive Nodes</div>
      <div class="__mdt-stat-grid">
        <div class="__mdt-stat">
          <div class="__mdt-stat-value">${stats.signals}</div>
          <div class="__mdt-stat-label">Signals</div>
        </div>
        <div class="__mdt-stat">
          <div class="__mdt-stat-value">${stats.computeds}</div>
          <div class="__mdt-stat-label">Computed</div>
        </div>
        <div class="__mdt-stat">
          <div class="__mdt-stat-value">${stats.effects}</div>
          <div class="__mdt-stat-label">Effects</div>
        </div>
        <div class="__mdt-stat">
          <div class="__mdt-stat-value">${stats.renderEffects}</div>
          <div class="__mdt-stat-label">Render Fx</div>
        </div>
        <div class="__mdt-stat">
          <div class="__mdt-stat-value">${stats.total}</div>
          <div class="__mdt-stat-label">Total</div>
        </div>
        <div class="__mdt-stat">
          <div class="__mdt-stat-value" style="color: ${stats.dirty > 0 ? '#e74c3c' : '#4ade80'}">${stats.dirty}</div>
          <div class="__mdt-stat-label">Dirty</div>
        </div>
      </div>
    </div>
    <div class="__mdt-section">
      <div class="__mdt-section-title">Components</div>
      <div class="__mdt-stat-grid">
        <div class="__mdt-stat">
          <div class="__mdt-stat-value">${countComponents()}</div>
          <div class="__mdt-stat-label">Mounted</div>
        </div>
      </div>
    </div>
    <div class="__mdt-section">
      <div class="__mdt-section-title">Console</div>
      <div style="color: #888; font-size: 11px; line-height: 1.5">
        <code style="color: #7ec8e3">__MIKATA_DEVTOOLS__.graph()</code> — full graph<br>
        <code style="color: #7ec8e3">.inspect(id)</code> — node details<br>
        <code style="color: #7ec8e3">.why(id)</code> — dependency chain<br>
        <code style="color: #7ec8e3">.subscribers(id)</code> — subscriber chain<br>
        <code style="color: #7ec8e3">.search("label")</code> — find by label
      </div>
    </div>
  `;
}

function renderSignals(body: HTMLElement): void {
  const graph = getGraphSnapshot();
  const allValueNodes = [...graph.signals, ...graph.computeds];

  if (allValueNodes.length === 0) {
    body.innerHTML = '<div class="__mdt-empty">No signals or computed values</div>';
    return;
  }

  body.innerHTML = `
    <ul class="__mdt-node-list">
      ${allValueNodes.map((n) => `
        <li class="__mdt-node" title="ID: ${n.id} | Sources: ${n.sourceCount} | Subscribers: ${n.subscriberCount}">
          <span>
            <span class="__mdt-badge ${n.kind === 'signal' ? '__mdt-badge-signal' : '__mdt-badge-computed'}">${n.kind === 'signal' ? 'SIG' : 'CMP'}</span>
            <span class="__mdt-node-label">${n.label ? escapeHtml(n.label) : `#${n.id}`}</span>
            ${n.dirty ? '<span class="__mdt-dirty"> dirty</span>' : ''}
          </span>
          <span class="__mdt-node-value">${formatValue(n.value)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderEffects(body: HTMLElement): void {
  const graph = getGraphSnapshot();
  const allEffects = [...graph.effects, ...graph.renderEffects];

  if (allEffects.length === 0) {
    body.innerHTML = '<div class="__mdt-empty">No effects</div>';
    return;
  }

  body.innerHTML = `
    <ul class="__mdt-node-list">
      ${allEffects.map((n) => `
        <li class="__mdt-node" title="ID: ${n.id} | Sources: ${n.sourceCount}">
          <span>
            <span class="__mdt-badge ${n.kind === 'effect' ? '__mdt-badge-effect' : '__mdt-badge-render'}">${n.kind === 'effect' ? 'FX' : 'RFX'}</span>
            <span class="__mdt-node-label">${n.label ? escapeHtml(n.label) : `#${n.id}`}</span>
            ${n.dirty ? '<span class="__mdt-dirty"> dirty</span>' : ''}
          </span>
          <span class="__mdt-node-value">${n.sourceCount} dep${n.sourceCount !== 1 ? 's' : ''}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderComponentTree(body: HTMLElement): void {
  const tree = getComponentTree();

  if (tree.length === 0) {
    body.innerHTML = '<div class="__mdt-empty">No components mounted</div>';
    return;
  }

  body.innerHTML = tree.map(renderTreeNode).join('');
}

function renderTreeNode(node: ComponentTreeSnapshot, depth = 0): string {
  const indent = depth * 16;
  const dimmed = !node.inDOM ? ' style="opacity: 0.4"' : '';
  const children = node.children.map((c) => renderTreeNode(c, depth + 1)).join('');

  return `
    <div class="__mdt-tree-node" style="padding-left: ${indent}px"${dimmed}>
      <span class="__mdt-tree-name">&lt;${escapeHtml(node.name)} /&gt;</span>
      ${!node.inDOM ? ' <span style="color: #666; font-size: 10px">(unmounted)</span>' : ''}
    </div>
    ${children}
  `;
}

function countComponents(): number {
  let count = 0;
  function walk(nodes: ComponentTreeNode[]) {
    for (const n of nodes) {
      count++;
      walk(n.children);
    }
  }
  walk(rootComponents);
  return count;
}

function formatValue(value: unknown): string {
  if (value === undefined) return '<span style="color:#666">undefined</span>';
  if (value === null) return '<span style="color:#666">null</span>';
  if (typeof value === 'string') return `"${escapeHtml(value.length > 20 ? value.slice(0, 20) + '...' : value)}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return `{${Object.keys(value).length}}`;
  return String(value);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Show / hide / toggle
// ---------------------------------------------------------------------------

function showOverlay(): void {
  if (!overlayEl) {
    overlayEl = createOverlay();
  }
  document.body.appendChild(overlayEl);
  overlayVisible = true;
  refreshContent();

  // Auto-refresh every 1s
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshContent, 1000);
}

function hideOverlay(): void {
  if (overlayEl && overlayEl.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
  }
  overlayVisible = false;
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function toggleOverlay(): void {
  if (overlayVisible) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

// ---------------------------------------------------------------------------
// Install devtools
// ---------------------------------------------------------------------------

/**
 * Install the devtools API and (optionally) the overlay.
 * Called automatically in dev mode by the runtime.
 */
export function installDevTools(options?: { overlay?: boolean }): void {
  if (typeof window === 'undefined') return;

  const api = createDevToolsAPI();
  (window as any).__MIKATA_DEVTOOLS__ = api;

  if (options?.overlay !== false) {
    // Register keyboard shortcut: Ctrl+Shift+M (or Cmd+Shift+M)
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
