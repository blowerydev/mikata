import { mergeClasses } from '../../utils/class-merge';
import type { CardProps } from './Card.types';
import './Card.css';

export function Card(props: CardProps = {}): HTMLElement {
  const {
    shadow = 'sm',
    padding = 'md',
    radius = 'sm',
    withBorder = false,
    classNames,
    children,
    header,
    footer,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses(
    'mkt-card',
    withBorder && 'mkt-card--bordered',
    className,
    classNames?.root,
  );
  el.dataset.shadow = shadow;
  el.dataset.padding = padding;
  el.dataset.radius = radius;

  if (header != null) {
    const headerEl = document.createElement('div');
    headerEl.className = mergeClasses('mkt-card__header', classNames?.header);
    if (typeof header === 'string') {
      headerEl.textContent = header;
    } else {
      headerEl.appendChild(header);
    }
    el.appendChild(headerEl);
  }

  const body = document.createElement('div');
  body.className = mergeClasses('mkt-card__body', classNames?.body);
  if (children instanceof Node) {
    body.appendChild(children);
  } else if (children != null) {
    body.textContent = String(children);
  }
  el.appendChild(body);

  if (footer != null) {
    const footerEl = document.createElement('div');
    footerEl.className = mergeClasses('mkt-card__footer', classNames?.footer);
    if (typeof footer === 'string') {
      footerEl.textContent = footer;
    } else {
      footerEl.appendChild(footer);
    }
    el.appendChild(footerEl);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
