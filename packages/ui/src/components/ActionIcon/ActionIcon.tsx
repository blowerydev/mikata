import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
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

  // `children`, `loading`, `onClick` are structural — they decide DOM shape
  // and event wiring. The Loader overlay captures size/color/variant once.
  const children = props.children;
  const loading = props.loading;
  const onClick = props.onClick;

  const el = document.createElement('button');
  renderEffect(() => {
    el.className = mergeClasses('mkt-action-icon', props.class);
  });
  el.type = 'button';

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

  if (onClick) el.addEventListener('click', onClick);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLButtonElement | null }).current = el;
  }

  if (children) el.appendChild(children);

  if (loading) {
    const loaderWrap = document.createElement('span');
    loaderWrap.className = 'mkt-action-icon__loader';
    const variant = props.variant ?? 'subtle';
    const size = props.size ?? 'md';
    const color = props.color ?? 'primary';
    loaderWrap.appendChild(
      Loader({ size, color: variant === 'filled' ? undefined : color }),
    );
    el.appendChild(loaderWrap);
  }

  return el;
}
