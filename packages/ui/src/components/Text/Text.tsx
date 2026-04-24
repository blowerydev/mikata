import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { TextProps } from './Text.types';
import './Text.css';

export function Text(userProps: TextProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<TextProps>('Text') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as TextProps;

  return adoptElement<HTMLElement>(props.component ?? 'p', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-text', props.class);
    });
    renderEffect(() => { el.dataset.size = props.size ?? 'md'; });

    renderEffect(() => {
      if (props.weight) el.dataset.weight = props.weight;
      else delete el.dataset.weight;
    });
    renderEffect(() => {
      if (props.color) el.dataset.color = props.color;
      else delete el.dataset.color;
    });
    renderEffect(() => {
      if (props.inline) el.dataset.inline = '';
      else delete el.dataset.inline;
    });
    renderEffect(() => {
      if (props.truncate) el.dataset.truncate = '';
      else delete el.dataset.truncate;
    });
    renderEffect(() => {
      const lc = props.lineClamp;
      if (lc != null) {
        el.dataset.lineClamp = '';
        el.style.setProperty('-webkit-line-clamp', String(lc));
      } else {
        delete el.dataset.lineClamp;
        el.style.removeProperty('-webkit-line-clamp');
      }
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
  });
}
