import { createIcon } from '@mikata/icons';
import type { IconNode } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
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

  // `src`, `name` are structural — decide which child (img vs placeholder)
  // exists.
  const src = props.src;
  const name = props.name;

  const el = document.createElement('div');
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

  const showPlaceholder = () => {
    const placeholder = document.createElement('span');
    renderEffect(() => {
      placeholder.className = mergeClasses('mkt-avatar__placeholder', props.classNames?.placeholder);
    });

    if (name) {
      placeholder.textContent = getInitials(name);
    } else {
      placeholder.appendChild(createIcon(UserSilhouette, { size: '60%' }));
    }

    el.appendChild(placeholder);
  };

  if (src) {
    const img = document.createElement('img');
    renderEffect(() => {
      img.className = mergeClasses('mkt-avatar__image', props.classNames?.image);
    });
    img.src = src;
    img.alt = props.alt || name || '';
    img.addEventListener('error', () => {
      img.remove();
      showPlaceholder();
    });
    el.appendChild(img);
  } else {
    showPlaceholder();
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}

export function AvatarGroup(userProps: AvatarGroupProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as AvatarGroupProps;

  const children = props.children;

  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-avatar-group', props.class);
  });
  renderEffect(() => { el.dataset.spacing = props.spacing ?? 'sm'; });

  children.forEach((child) => el.appendChild(child));

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
