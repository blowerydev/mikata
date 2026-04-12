import { mergeClasses } from '../../utils/class-merge';
import type { ListProps, ListItemProps } from './List.types';
import './List.css';

export function ListItem(props: ListItemProps = {}): HTMLLIElement {
  const { icon, children, class: className, ref } = props;

  const li = document.createElement('li');
  li.className = mergeClasses('mkt-list__item', className);

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

  if (ref) {
    if (typeof ref === 'function') ref(li as any);
    else (ref as any).current = li;
  }

  return li;
}

export function List(props: ListProps = {}): HTMLElement {
  const {
    type = 'unordered',
    icon,
    size = 'md',
    spacing,
    center,
    withPadding,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement(type === 'ordered' ? 'ol' : 'ul');
  el.className = mergeClasses('mkt-list', className, classNames?.root);
  el.dataset.size = size;
  if (spacing) el.dataset.spacing = spacing;
  if (center) el.dataset.center = '';
  if (icon) el.dataset.customIcon = '';
  if (withPadding) el.dataset.withPadding = '';

  // If a list-level icon is provided, prepend it to any list items that don't have their own
  const appendItems = (list: HTMLElement, items: Node[]) => {
    for (const child of items) {
      if (child instanceof HTMLLIElement && icon && !child.dataset.withIcon) {
        child.dataset.withIcon = '';
        const iconWrap = document.createElement('span');
        iconWrap.className = mergeClasses('mkt-list__item-icon', classNames?.itemIcon);
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

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}

List.Item = ListItem;
