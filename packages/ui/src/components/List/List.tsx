import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { ListProps, ListItemProps } from './List.types';
import './List.css';

export function ListItem(userProps: ListItemProps = {}): HTMLLIElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ListItemProps;

  const icon = props.icon;

  return adoptElement<HTMLLIElement>('li', (li) => {
    renderEffect(() => {
      li.className = mergeClasses('mkt-list__item', props.class);
    });

    if (icon) {
      li.dataset.withIcon = '';
      adoptElement<HTMLSpanElement>('span', (iconWrap) => {
        iconWrap.className = 'mkt-list__item-icon';
        if (!iconWrap.firstChild) iconWrap.appendChild(icon);
      });
    }

    adoptElement<HTMLSpanElement>('span', (body) => {
      body.className = 'mkt-list__item-body';
      const children = props.children;
      if (children != null) {
        if (typeof children === 'string') {
          if (body.textContent !== children) body.textContent = children;
        } else if (Array.isArray(children)) {
          for (const c of children) if (c.parentNode !== body) body.appendChild(c);
        } else if (children.parentNode !== body) {
          body.appendChild(children);
        }
      }
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(li);
      else (ref as { current: HTMLLIElement | null }).current = li;
    }
  });
}

export function List(userProps: ListProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ListProps;

  const type = props.type ?? 'unordered';
  const icon = props.icon;

  return adoptElement<HTMLElement>(type === 'ordered' ? 'ol' : 'ul', (el) => {
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

    const children = props.children;
    if (children) {
      const arr = Array.isArray(children) ? children : [children];
      for (const child of arr) {
        if (child instanceof HTMLLIElement && icon && !child.dataset.withIcon) {
          child.dataset.withIcon = '';
          const iconWrap = document.createElement('span');
          iconWrap.className = mergeClasses('mkt-list__item-icon', props.classNames?.itemIcon);
          iconWrap.appendChild(typeof icon === 'function' ? icon() : icon.cloneNode(true));
          child.insertBefore(iconWrap, child.firstChild);
        }
        if (child.parentNode !== el) el.appendChild(child);
      }
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}

List.Item = ListItem;
