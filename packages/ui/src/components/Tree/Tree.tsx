import { mergeClasses } from '../../utils/class-merge';
import type { TreeProps, TreeNode } from './Tree.types';
import './Tree.css';

const CARET =
  '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M6 4L10 8L6 12"/></svg>';

export function Tree(props: TreeProps): HTMLElement {
  const {
    data,
    defaultExpanded = [],
    onSelect,
    selected,
    classNames,
    class: className,
    ref,
  } = props;

  const expanded = new Set<string>(defaultExpanded);

  const root = document.createElement('ul');
  root.className = mergeClasses('mkt-tree', className, classNames?.root);
  root.setAttribute('role', 'tree');

  const renderNode = (node: TreeNode, level: number): HTMLElement => {
    const li = document.createElement('li');
    li.className = mergeClasses('mkt-tree__node', classNames?.node);
    li.setAttribute('role', 'treeitem');
    const hasChildren = !!(node.children && node.children.length);
    if (hasChildren) li.setAttribute('aria-expanded', expanded.has(node.value) ? 'true' : 'false');
    if (selected === node.value) li.dataset.selected = '';
    li.style.setProperty('--_tree-level', String(level));

    const label = document.createElement('div');
    label.className = mergeClasses('mkt-tree__node-label', classNames?.nodeLabel);
    label.setAttribute('tabindex', '0');

    const expander = document.createElement('span');
    expander.className = mergeClasses('mkt-tree__expander', classNames?.expander);
    if (hasChildren) {
      expander.innerHTML = CARET;
      if (expanded.has(node.value)) expander.dataset.open = '';
    }
    label.appendChild(expander);

    const text = document.createElement('span');
    text.className = 'mkt-tree__node-text';
    if (node.label instanceof Node) text.appendChild(node.label);
    else text.textContent = node.label;
    label.appendChild(text);

    const toggle = () => {
      if (!hasChildren) return;
      if (expanded.has(node.value)) expanded.delete(node.value);
      else expanded.add(node.value);
      li.setAttribute('aria-expanded', expanded.has(node.value) ? 'true' : 'false');
      if (expanded.has(node.value)) expander.dataset.open = '';
      else delete expander.dataset.open;
      childrenEl.style.display = expanded.has(node.value) ? '' : 'none';
    };

    label.addEventListener('click', () => {
      if (hasChildren) toggle();
      onSelect?.(node.value, node);
    });
    label.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasChildren) toggle();
        onSelect?.(node.value, node);
      } else if (e.key === 'ArrowRight' && hasChildren && !expanded.has(node.value)) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowLeft' && hasChildren && expanded.has(node.value)) {
        e.preventDefault();
        toggle();
      }
    });

    li.appendChild(label);

    const childrenEl = document.createElement('ul');
    childrenEl.className = mergeClasses('mkt-tree__node-children', classNames?.nodeChildren);
    childrenEl.setAttribute('role', 'group');
    if (!expanded.has(node.value)) childrenEl.style.display = 'none';
    if (hasChildren) {
      node.children!.forEach((child) => childrenEl.appendChild(renderNode(child, level + 1)));
    }
    li.appendChild(childrenEl);

    return li;
  };

  data.forEach((n) => root.appendChild(renderNode(n, 0)));

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }
  return root;
}
