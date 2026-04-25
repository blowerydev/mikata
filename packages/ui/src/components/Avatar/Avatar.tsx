import { createIcon } from '../../internal/icons';
import type { IconNode } from '../../internal/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { AvatarProps, AvatarGroupProps } from './Avatar.types';
import './Avatar.css';

const UserSilhouette: IconNode = [
  'svg',
  { viewBox: '0 0 16 16', fill: 'currentColor' },
  [['path', { d: 'M8 8a3 3 0 100-6 3 3 0 000 6zM2 14s0-4 6-4 6 4 6 4H2z' }]],
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar(userProps: AvatarProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as AvatarProps;

  // `src`, `name` are structural - `src` presence decides img vs
  // placeholder child. SSR and client see the same initial `src`
  // (props don't diverge across the boundary), so the structure is
  // stable for adoption.
  const src = props.src;
  const name = props.name;

  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-avatar', props.class, props.classNames?.root);
    });
    renderEffect(() => { el.dataset.size = props.size ?? 'md'; });
    renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });
    renderEffect(() => { el.dataset.variant = props.variant ?? 'light'; });
    renderEffect(() => { el.dataset.radius = props.radius ?? 'full'; });
    el.setAttribute('role', 'img');
    renderEffect(() => {
      el.setAttribute('aria-label', props.alt || props.name || 'Avatar');
    });

    if (src) {
      adoptElement<HTMLImageElement>('img', (img) => {
        renderEffect(() => {
          img.className = mergeClasses('mkt-avatar__image', props.classNames?.image);
        });
        img.setAttribute('src', src);
        img.setAttribute('alt', props.alt || name || '');
        img.addEventListener('error', () => {
          // On image failure, swap to a placeholder. This rebuilds the
          // subtree imperatively - the adoption invariant only needs
          // to hold through hydration, and post-load behaviour can
          // mutate the DOM freely.
          img.remove();
          const placeholder = document.createElement('span');
          placeholder.className = mergeClasses(
            'mkt-avatar__placeholder',
            props.classNames?.placeholder,
          );
          if (name) {
            placeholder.textContent = getInitials(name);
          } else {
            placeholder.appendChild(createIcon(UserSilhouette, { size: '60%' }));
          }
          el.appendChild(placeholder);
        });
      });
    } else {
      adoptElement<HTMLSpanElement>('span', (placeholder) => {
        renderEffect(() => {
          placeholder.className = mergeClasses(
            'mkt-avatar__placeholder',
            props.classNames?.placeholder,
          );
        });
        if (!placeholder.firstChild) {
          if (name) placeholder.textContent = getInitials(name);
          else placeholder.appendChild(createIcon(UserSilhouette, { size: '60%' }));
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

export function AvatarGroup(userProps: AvatarGroupProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as AvatarGroupProps;

  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-avatar-group', props.class);
    });
    renderEffect(() => { el.dataset.spacing = props.spacing ?? 'sm'; });

    for (const child of props.children) {
      if (child.parentNode !== el) el.appendChild(child);
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
