import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { ListProps, ListItemProps } from './List.types';
import './List.css';

export function ListItem(userProps: ListItemProps = {}): HTMLLIElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ListItemProps;

  // `icon`, `children` are structural — decide which child nodes exist.
  const icon = props.icon;
  const children = props.children;

  const li = document.createElement('li');
  renderEffect(() => {
    li.className = mergeClasses('mkt-list__item', props.class);
  });

  if (icon) {
    li.dataset.withIcon = '';
    const iconWrap = document.createElement('span');
    iconWrap.className = 'mkt-list__item-icon';
    iconWrap.appendChild(icon);
    li.appendChild(iconWrap);
  }

  const body = document.createElement('span');
  body.className = 'mkt-list__item-body';
  if (children != null) {
    if (typeof children === 'string') body.textContent = children;
    else if (Array.isArray(children)) for (const c of children) body.appendChild(c);
    else body.appendChild(children);
  }
  li.appendChild(body);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(li);
    else (ref as { current: HTMLLIElement | null }).current = li;
  }

  return li;
}

export function List(userProps: ListProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ListProps;

  // `type`, `icon`, `children` are structural — decide tag, shared icon,
  // and items at setup.
  const type = props.type ?? 'unordered';
  const icon = props.icon;
  const children = props.children;

  const el = document.createElement(type === 'ordered' ? 'ol' : 'ul');
  renderEffect(() => {
    el.className = mergeClasses('mkt-list', props.class, props.classNames?.root);
  });
  renderEffect(() => { el.dataset.size = props.size ?? 'md'; });
  renderEffect(() => {
    if (props.spacing) el.dataset.spacing = props.spacing;
    else delete el.dataset.spacing;
  });
  renderEffect(() => {
    if (props.center) el.dataset.center = '';
    else delete el.dataset.center;
  });
  if (icon) el.dataset.customIcon = '';
  renderEffect(() => {
    if (props.withPadding) el.dataset.withPadding = '';
    else delete el.dataset.withPadding;
  });

  const appendItems = (list: HTMLElement, items: Node[]) => {
    for (const child of items) {
      if (child instanceof HTMLLIElement && icon && !child.dataset.withIcon) {
        child.dataset.withIcon = '';
        const iconWrap = document.createElement('span');
        renderEffect(() => {
          iconWrap.className = mergeClasses('mkt-list__item-icon', props.classNames?.itemIcon);
        });
        iconWrap.appendChild(typeof icon === 'function' ? icon() : icon.cloneNode(true));
        child.insertBefore(iconWrap, child.firstChild);
      }
      list.appendChild(child);
    }
  };

  if (children) {
    const arr = Array.isArray(children) ? children : [children];
    appendItems(el, arr);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}

List.Item = ListItem;
