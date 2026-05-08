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
import {
  findComponentForElement,
  getComponentTree,
  type ComponentTreeSnapshot,
} from './component-tree';

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

export function createDevToolsAPI(overlay: {
  show(): void;
  hide(): void;
  toggle(): void;
}): MikataDevTools {
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
    show: overlay.show,
    hide: overlay.hide,
    toggle: overlay.toggle,
    version: '0.1.0',
  };
}
