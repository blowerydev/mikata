import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { Loader } from '../Loader';
import type { ActionIconProps } from './ActionIcon.types';
import './ActionIcon.css';

export function ActionIcon(userProps: ActionIconProps = {}): HTMLButtonElement {
  const props = _mergeProps(
    useComponentDefaults<ActionIconProps>('ActionIcon') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as ActionIconProps;

  const loading = props.loading;

  return adoptElement<HTMLButtonElement>('button', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-action-icon', props.class);
    });
    el.setAttribute('type', 'button');

    renderEffect(() => { el.dataset.variant = props.variant ?? 'subtle'; });
    renderEffect(() => { el.dataset.size = (props.size as string) ?? 'md'; });
    renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });

    renderEffect(() => {
      const aria = props['aria-label'];
      if (aria) el.setAttribute('aria-label', aria);
      else el.removeAttribute('aria-label');
    });

    renderEffect(() => {
      el.disabled = !!props.disabled || !!props.loading;
    });

    if (loading) {
      el.dataset.loading = '';
      el.setAttribute('aria-busy', 'true');
    }

    const onClick = props.onClick;
    if (onClick) el.addEventListener('click', onClick);

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLButtonElement | null }).current = el;
    }

    const children = props.children;
    if (children && children.parentNode !== el) el.appendChild(children);

    // Loader overlay appears only when `loading` is true — read once
    // at setup since the structure depends on it. On hydration the
    // SSR tree already has the overlay present when loading=true.
    if (loading) {
      adoptElement<HTMLSpanElement>('span', (loaderWrap) => {
        loaderWrap.className = 'mkt-action-icon__loader';
        const variant = props.variant ?? 'subtle';
        const size = props.size ?? 'md';
        const color = props.color ?? 'primary';
        if (!loaderWrap.firstChild) {
          loaderWrap.appendChild(
            Loader({ size, color: variant === 'filled' ? undefined : color }),
          );
        }
      });
    }
  });
}
