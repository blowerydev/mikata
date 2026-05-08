export interface ComponentTreeNode {
  name: string;
  node: Node;
  children: ComponentTreeNode[];
  parent: ComponentTreeNode | null;
  /** performance.now() at mount. */
  mountedAt: number;
}

export interface ComponentTreeSnapshot {
  name: string;
  children: ComponentTreeSnapshot[];
  inDOM: boolean;
  /** Live reference to the DOM node - used for hover/highlight. */
  domNode: Node;
  mountedAt: number;
}

const rootComponents: ComponentTreeNode[] = [];
const nodeToComponent = new WeakMap<Node, ComponentTreeNode>();

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

export function getComponentTree(): ComponentTreeSnapshot[] {
  return rootComponents.map(snapshotComponentTree);
}

export function findComponentForElement(el: Node | null): ComponentTreeNode | null {
  let cur: Node | null = el;
  while (cur) {
    const entry = nodeToComponent.get(cur);
    if (entry) return entry;
    cur = cur.parentNode;
  }
  return null;
}

export function countComponents(): number {
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

function snapshotComponentTree(entry: ComponentTreeNode): ComponentTreeSnapshot {
  return {
    name: entry.name,
    inDOM: !!entry.node.parentNode || (entry.node as ChildNode).isConnected,
    children: entry.children.map(snapshotComponentTree),
    domNode: entry.node,
    mountedAt: entry.mountedAt,
  };
}
