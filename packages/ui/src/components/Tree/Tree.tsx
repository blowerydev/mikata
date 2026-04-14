import { createIcon, ChevronRight } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useDirection } from '../../theme';
import type { TreeProps, TreeNode } from './Tree.types';
import './Tree.css';

export function Tree(userProps: TreeProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as TreeProps;
  const direction = useDirection();

  // `data` and `defaultExpanded` are structural — used to seed the DOM once.
  const data = props.data;
  const expanded = new Set<string>(props.defaultExpanded ?? []);

  const root = document.createElement('ul');
  renderEffect(() => {
    root.className = mergeClasses('mkt-tree', props.class, props.classNames?.root);
  });
  root.setAttribute('role', 'tree');

  const renderNode = (node: TreeNode, level: number): HTMLElement => {
    const li = document.createElement('li');
    renderEffect(() => {
      li.className = mergeClasses('mkt-tree__node', props.classNames?.node);
    });
    li.setAttribute('role', 'treeitem');
    const hasChildren = !!(node.children && node.children.length);
    if (hasChildren) li.setAttribute('aria-expanded', expanded.has(node.value) ? 'true' : 'false');
    renderEffect(() => {
      if (props.selected === node.value) li.dataset.selected = '';
      else delete li.dataset.selected;
    });
    li.style.setProperty('--_tree-level', String(level));

    const label = document.createElement('div');
    renderEffect(() => {
      label.className = mergeClasses('mkt-tree__node-label', props.classNames?.nodeLabel);
    });
    label.setAttribute('tabindex', '0');

    const expander = document.createElement('span');
    renderEffect(() => {
      expander.className = mergeClasses('mkt-tree__expander', props.classNames?.expander);
    });
    if (hasChildren) {
      expander.appendChild(createIcon(ChevronRight, { size: 12 }));
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
      props.onSelect?.(node.value, node);
    });
    label.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasChildren) toggle();
        props.onSelect?.(node.value, node);
      } else {
        const isRtl = direction() === 'rtl';
        const expandKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
        const collapseKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
        if (e.key === expandKey && hasChildren && !expanded.has(node.value)) {
          e.preventDefault();
          toggle();
        } else if (e.key === collapseKey && hasChildren && expanded.has(node.value)) {
          e.preventDefault();
          toggle();
        }
      }
    });

    li.appendChild(label);

    const childrenEl = document.createElement('ul');
    renderEffect(() => {
      childrenEl.className = mergeClasses('mkt-tree__node-children', props.classNames?.nodeChildren);
    });
    childrenEl.setAttribute('role', 'group');
    if (!expanded.has(node.value)) childrenEl.style.display = 'none';
    if (hasChildren) {
      node.children!.forEach((child) => childrenEl.appendChild(renderNode(child, level + 1)));
    }
    li.appendChild(childrenEl);

    return li;
  };

  data.forEach((n) => root.appendChild(renderNode(n, 0)));

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }
  return root;
}
