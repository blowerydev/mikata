import { mergeClasses } from '../../utils/class-merge';
import type { BreadcrumbProps } from './Breadcrumb.types';
import './Breadcrumb.css';

export function Breadcrumb(props: BreadcrumbProps): HTMLElement {
  const {
    items,
    separator = '/',
    size = 'md',
    classNames,
    class: className,
    ref,
  } = props;

  const nav = document.createElement('nav');
  nav.className = mergeClasses('mkt-breadcrumb', className, classNames?.root);
  nav.setAttribute('aria-label', 'Breadcrumb');
  nav.dataset.size = size;

  const ol = document.createElement('ol');
  ol.className = 'mkt-breadcrumb__list';

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'mkt-breadcrumb__li';
    const isLast = index === items.length - 1;

    if (item.href || item.onClick) {
      const link = document.createElement('a');
      link.className = mergeClasses('mkt-breadcrumb__item', classNames?.item);
      if (item.label instanceof Node) { link.appendChild(item.label); } else { link.textContent = item.label; }
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
      span.className = mergeClasses('mkt-breadcrumb__item', classNames?.item);
      if (item.label instanceof Node) { span.appendChild(item.label); } else { span.textContent = item.label; }
      if (isLast) span.setAttribute('aria-current', 'page');
      li.appendChild(span);
    }

    if (!isLast) {
      const sep = document.createElement('span');
      sep.className = mergeClasses('mkt-breadcrumb__separator', classNames?.separator);
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = separator;
      li.appendChild(sep);
    }

    ol.appendChild(li);
  });

  nav.appendChild(ol);

  if (ref) {
    if (typeof ref === 'function') ref(nav);
    else (ref as any).current = nav;
  }

  return nav;
}
