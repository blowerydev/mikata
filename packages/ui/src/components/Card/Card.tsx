import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { CardProps } from './Card.types';
import './Card.css';

export function Card(userProps: CardProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<CardProps>('Card') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as CardProps;

  // `header`, `footer`, `children` are structural — decide which sub-elements
  // exist.
  const header = props.header;
  const footer = props.footer;
  const children = props.children;

  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses(
      'mkt-card',
      props.withBorder && 'mkt-card--bordered',
      props.class,
      props.classNames?.root,
    );
  });
  renderEffect(() => { el.dataset.shadow = props.shadow ?? 'sm'; });
  renderEffect(() => { el.dataset.padding = props.padding ?? 'md'; });
  renderEffect(() => { el.dataset.radius = props.radius ?? 'sm'; });

  if (header != null) {
    const headerEl = document.createElement('div');
    renderEffect(() => {
      headerEl.className = mergeClasses('mkt-card__header', props.classNames?.header);
    });
    if (typeof header === 'string') headerEl.textContent = header;
    else headerEl.appendChild(header);
    el.appendChild(headerEl);
  }

  const body = document.createElement('div');
  renderEffect(() => {
    body.className = mergeClasses('mkt-card__body', props.classNames?.body);
  });
  if (children instanceof Node) body.appendChild(children);
  else if (children != null) body.textContent = String(children);
  el.appendChild(body);

  if (footer != null) {
    const footerEl = document.createElement('div');
    renderEffect(() => {
      footerEl.className = mergeClasses('mkt-card__footer', props.classNames?.footer);
    });
    if (typeof footer === 'string') footerEl.textContent = footer;
    else footerEl.appendChild(footer);
    el.appendChild(footerEl);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
