import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { TitleProps } from './Title.types';
import './Title.css';

export function Title(userProps: TitleProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<TitleProps>('Title') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as TitleProps;

  // `order` is read once: the HTML tag is fixed at setup.
  const order = props.order ?? 1;
  const el = document.createElement(`h${order}`);
  el.dataset.order = String(order);
  renderEffect(() => {
    el.className = mergeClasses('mkt-title', props.class);
  });

  renderEffect(() => {
    const c = props.children;
    if (c == null) {
      el.textContent = '';
    } else if (typeof c === 'string') {
      el.textContent = c;
    } else {
      el.replaceChildren(c);
    }
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
