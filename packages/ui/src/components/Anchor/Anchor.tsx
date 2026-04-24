import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { AnchorProps } from './Anchor.types';
import './Anchor.css';

export function Anchor(userProps: AnchorProps = {}): HTMLAnchorElement {
  const props = _mergeProps(
    useComponentDefaults<AnchorProps>('Anchor') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as AnchorProps;

  return adoptElement<HTMLAnchorElement>('a', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-anchor', props.class);
    });

    renderEffect(() => {
      const href = props.href;
      if (href) el.setAttribute('href', href);
      else el.removeAttribute('href');
    });
    renderEffect(() => {
      const target = props.target;
      if (target) {
        el.setAttribute('target', target);
        if (target === '_blank') el.setAttribute('rel', 'noopener noreferrer');
        else el.removeAttribute('rel');
      } else {
        el.removeAttribute('target');
        el.removeAttribute('rel');
      }
    });

    renderEffect(() => { el.dataset.underline = props.underline ?? 'hover'; });
    renderEffect(() => {
      if (props.size) el.dataset.size = props.size;
      else delete el.dataset.size;
    });
    renderEffect(() => {
      if (props.color) el.dataset.color = props.color;
      else delete el.dataset.color;
    });

    const children = props.children;
    if (children != null) {
      if (typeof children === 'string') {
        if (el.textContent !== children) el.textContent = children;
      } else if (children.parentNode !== el) {
        el.appendChild(children);
      }
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLAnchorElement | null }).current = el;
    }
  });
}
