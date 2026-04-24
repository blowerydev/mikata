import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { BreadcrumbProps } from './Breadcrumb.types';
import './Breadcrumb.css';

export function Breadcrumb(userProps: BreadcrumbProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as BreadcrumbProps;

  // `items` and `separator` are structural — re-rendering on item
  // changes would need keyed reconciliation. Pass a new items array
  // by remounting.
  const items = props.items;
  const separator = props.separator ?? '/';

  return adoptElement<HTMLElement>('nav', (nav) => {
    renderEffect(() => {
      nav.className = mergeClasses('mkt-breadcrumb', props.class, props.classNames?.root);
    });
    nav.setAttribute('aria-label', 'Breadcrumb');
    renderEffect(() => { nav.dataset.size = props.size ?? 'md'; });

    adoptElement<HTMLOListElement>('ol', (ol) => {
      ol.className = 'mkt-breadcrumb__list';

      // Build items only when not yet present (fresh render). On
      // hydration the SSR list survives; we still wire the click
      // handlers per item via querying the adopted anchors below.
      if (!ol.firstChild) {
        items.forEach((item, index) => {
          const li = document.createElement('li');
          li.className = 'mkt-breadcrumb__li';
          const isLast = index === items.length - 1;

          const host = (item.href || item.onClick)
            ? document.createElement('a')
            : document.createElement('span');
          host.className = mergeClasses('mkt-breadcrumb__item', props.classNames?.item);
          const l = item.label;
          if (l == null) host.replaceChildren();
          else if (l instanceof Node) host.replaceChildren(l);
          else host.textContent = String(l);
          if (item.href && host instanceof HTMLAnchorElement) host.href = item.href;
          if (item.onClick) {
            host.addEventListener('click', (e) => {
              e.preventDefault();
              item.onClick!();
            });
          }
          if (isLast) host.setAttribute('aria-current', 'page');
          li.appendChild(host);

          if (!isLast) {
            const sep = document.createElement('span');
            sep.className = mergeClasses('mkt-breadcrumb__separator', props.classNames?.separator);
            sep.setAttribute('aria-hidden', 'true');
            sep.textContent = separator;
            li.appendChild(sep);
          }

          ol.appendChild(li);
        });
      } else {
        // Re-wire click handlers on the adopted items.
        const lis = ol.querySelectorAll<HTMLLIElement>('.mkt-breadcrumb__li');
        lis.forEach((li, index) => {
          const host = li.firstElementChild as HTMLElement | null;
          if (!host) return;
          const item = items[index];
          if (item?.onClick) {
            host.addEventListener('click', (e) => {
              e.preventDefault();
              item.onClick!();
            });
          }
        });
      }
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(nav);
      else (ref as { current: HTMLElement | null }).current = nav;
    }
  });
}
