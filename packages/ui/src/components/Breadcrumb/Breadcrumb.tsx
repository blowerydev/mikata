import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { BreadcrumbProps } from './Breadcrumb.types';
import './Breadcrumb.css';

export function Breadcrumb(userProps: BreadcrumbProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as BreadcrumbProps;

  // `items` and `separator` are structural — re-rendering on item changes
  // would need keyed reconciliation. Pass a new items array by remounting.
  const items = props.items;
  const separator = props.separator ?? '/';

  const nav = document.createElement('nav');
  renderEffect(() => {
    nav.className = mergeClasses('mkt-breadcrumb', props.class, props.classNames?.root);
  });
  nav.setAttribute('aria-label', 'Breadcrumb');
  renderEffect(() => { nav.dataset.size = props.size ?? 'md'; });

  const ol = document.createElement('ol');
  ol.className = 'mkt-breadcrumb__list';

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'mkt-breadcrumb__li';
    const isLast = index === items.length - 1;

    const bindLabel = (host: HTMLElement) => {
      renderEffect(() => {
        const l = props.items[index]?.label;
        if (l == null) host.replaceChildren();
        else if (l instanceof Node) host.replaceChildren(l);
        else host.textContent = String(l);
      });
    };

    if (item.href || item.onClick) {
      const link = document.createElement('a');
      renderEffect(() => {
        link.className = mergeClasses('mkt-breadcrumb__item', props.classNames?.item);
      });
      bindLabel(link);
      if (item.href) link.href = item.href;
      if (item.onClick) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          item.onClick!();
        });
      }
      if (isLast) link.setAttribute('aria-current', 'page');
      li.appendChild(link);
    } else {
      const span = document.createElement('span');
      renderEffect(() => {
        span.className = mergeClasses('mkt-breadcrumb__item', props.classNames?.item);
      });
      bindLabel(span);
      if (isLast) span.setAttribute('aria-current', 'page');
      li.appendChild(span);
    }

    if (!isLast) {
      const sep = document.createElement('span');
      renderEffect(() => {
        sep.className = mergeClasses('mkt-breadcrumb__separator', props.classNames?.separator);
      });
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = separator;
      li.appendChild(sep);
    }

    ol.appendChild(li);
  });

  nav.appendChild(ol);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(nav);
    else (ref as { current: HTMLElement | null }).current = nav;
  }

  return nav;
}
