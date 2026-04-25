import { createIcon, ChevronRight } from '../../internal/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useDirection } from '../../theme';
import type { TreeProps, TreeNode } from './Tree.types';
import './Tree.css';

export function Tree(userProps: TreeProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as TreeProps;
  const direction = useDirection();

  const data = props.data;
  const expanded = new Set<string>(props.defaultExpanded ?? []);

  return adoptElement<HTMLElement>('ul', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-tree', props.class, props.classNames?.root);
    });
    root.setAttribute('role', 'tree');

    // Tree structure is recursive; rather than a cursor-scoped rebuild
    // we keep the imperative build below (unchanged from the pre-
    // adoptElement version) and only engage when the root is empty.
    // On hydration we walk the adopted tree and re-wire the click /
    // keydown handlers by finding `.mkt-tree__node-label` elements and
    // correlating them with the data by index in pre-order traversal.
    if (!root.firstChild) {
      data.forEach((n) => root.appendChild(renderNode(n, 0)));
    } else {
      rewire(root);
    }

    function renderNode(node: TreeNode, level: number): HTMLElement {
      const li = document.createElement('li');
      li.className = mergeClasses('mkt-tree__node', props.classNames?.node);
      li.setAttribute('role', 'treeitem');
      const hasChildren = !!(node.children && node.children.length);
      if (hasChildren) li.setAttribute('aria-expanded', expanded.has(node.value) ? 'true' : 'false');
      if (props.selected === node.value) li.dataset.selected = '';
      li.style.setProperty('--_tree-level', String(level));

      const label = document.createElement('div');
      label.className = mergeClasses('mkt-tree__node-label', props.classNames?.nodeLabel);
      label.setAttribute('tabindex', '0');

      const expander = document.createElement('span');
      expander.className = mergeClasses('mkt-tree__expander', props.classNames?.expander);
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

      const childrenEl = document.createElement('ul');
      childrenEl.className = mergeClasses('mkt-tree__node-children', props.classNames?.nodeChildren);
      childrenEl.setAttribute('role', 'group');
      if (!expanded.has(node.value)) childrenEl.style.display = 'none';

      const toggle = () => {
        if (!hasChildren) return;
        if (expanded.has(node.value)) expanded.delete(node.value);
        else expanded.add(node.value);
        li.setAttribute('aria-expanded', expanded.has(node.value) ? 'true' : 'false');
        if (expanded.has(node.value)) expander.dataset.open = '';
        else delete expander.dataset.open;
        childrenEl.style.display = expanded.has(node.value) ? '' : 'none';
      };

      attachHandlers(label, node, hasChildren, toggle);

      li.appendChild(label);
      if (hasChildren) {
        node.children!.forEach((child) => childrenEl.appendChild(renderNode(child, level + 1)));
      }
      li.appendChild(childrenEl);
      return li;
    }

    function attachHandlers(label: HTMLElement, node: TreeNode, hasChildren: boolean, toggle: () => void) {
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
    }

    function rewire(container: HTMLElement) {
      // Walk the adopted tree and match each node-label to its data
      // node via pre-order traversal. Assumes SSR and client agree on
      // data shape (same assumption as the items list in the other
      // composite components).
      const iter = (function* walk(list: TreeNode[]): Generator<TreeNode> {
        for (const n of list) {
          yield n;
          if (n.children) yield* walk(n.children);
        }
      })(data);
      container.querySelectorAll<HTMLLIElement>('li.mkt-tree__node').forEach((li) => {
        const node = iter.next().value as TreeNode | undefined;
        if (!node) return;
        const label = li.querySelector<HTMLDivElement>('.mkt-tree__node-label');
        const expander = li.querySelector<HTMLSpanElement>('.mkt-tree__expander');
        const childrenEl = li.querySelector<HTMLUListElement>(':scope > .mkt-tree__node-children');
        if (!label) return;
        const hasChildren = !!(node.children && node.children.length);
        const toggle = () => {
          if (!hasChildren) return;
          if (expanded.has(node.value)) expanded.delete(node.value);
          else expanded.add(node.value);
          li.setAttribute('aria-expanded', expanded.has(node.value) ? 'true' : 'false');
          if (expander) {
            if (expanded.has(node.value)) expander.dataset.open = '';
            else delete expander.dataset.open;
          }
          if (childrenEl) childrenEl.style.display = expanded.has(node.value) ? '' : 'none';
        };
        attachHandlers(label, node, hasChildren, toggle);
      });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
