import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { CardProps } from './Card.types';
import './Card.css';

export function Card(userProps: CardProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<CardProps>('Card') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as CardProps;

  // `header` / `footer` are immutable props read once at render; the
  // subtree shape is fixed per instance, so SSR and client agree on
  // which slot elements exist.
  const header = props.header;
  const footer = props.footer;

  return adoptElement<HTMLElement>('div', (el) => {
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
      adoptElement<HTMLDivElement>('div', (headerEl) => {
        renderEffect(() => {
          headerEl.className = mergeClasses('mkt-card__header', props.classNames?.header);
        });
        if (typeof header === 'string') {
          if (headerEl.textContent !== header) headerEl.textContent = header;
        } else if (header.parentNode !== headerEl) {
          headerEl.appendChild(header);
        }
      });
    }

    adoptElement<HTMLDivElement>('div', (body) => {
      renderEffect(() => {
        body.className = mergeClasses('mkt-card__body', props.classNames?.body);
      });
      const children = props.children;
      if (children instanceof Node) {
        if (children.parentNode !== body) body.appendChild(children);
      } else if (children != null && body.textContent !== String(children)) {
        body.textContent = String(children);
      }
    });

    if (footer != null) {
      adoptElement<HTMLDivElement>('div', (footerEl) => {
        renderEffect(() => {
          footerEl.className = mergeClasses('mkt-card__footer', props.classNames?.footer);
        });
        if (typeof footer === 'string') {
          if (footerEl.textContent !== footer) footerEl.textContent = footer;
        } else if (footer.parentNode !== footerEl) {
          footerEl.appendChild(footer);
        }
      });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
