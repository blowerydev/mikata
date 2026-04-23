import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { LoaderProps } from './Loader.types';
import './Loader.css';

export function Loader(userProps: LoaderProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<LoaderProps>('Loader') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as LoaderProps;

  return adoptElement<HTMLElement>('span', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-loader', props.class);
    });
    el.setAttribute('role', 'status');
    renderEffect(() => { el.dataset.size = props.size ?? 'md'; });
    renderEffect(() => {
      if (props.color) el.dataset.color = props.color;
      else delete el.dataset.color;
    });

    adoptElement<HTMLElement>('span', (srText) => {
      srText.className = 'mkt-loader__sr-only';
      srText.textContent = 'Loading...';
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
