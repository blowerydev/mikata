import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { ThemeIconProps } from './ThemeIcon.types';
import './ThemeIcon.css';

export function ThemeIcon(userProps: ThemeIconProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<ThemeIconProps>('ThemeIcon') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as ThemeIconProps;

  return adoptElement<HTMLElement>('span', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-theme-icon', props.class);
    });
    renderEffect(() => { el.dataset.variant = props.variant ?? 'filled'; });
    renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });

    renderEffect(() => {
      const size = props.size ?? 'md';
      if (typeof size === 'number') {
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        delete el.dataset.size;
      } else {
        el.style.width = '';
        el.style.height = '';
        el.dataset.size = size;
      }
    });

    renderEffect(() => {
      const radius = props.radius;
      if (radius == null) {
        el.style.borderRadius = '';
        delete el.dataset.radius;
      } else if (typeof radius === 'number') {
        el.style.borderRadius = `${radius}px`;
        delete el.dataset.radius;
      } else {
        el.style.borderRadius = '';
        el.dataset.radius = radius;
      }
    });

    const children = props.children;
    if (children && children.parentNode !== el) el.appendChild(children);

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
