import { mergeClasses } from '../../utils/class-merge';
import type { AvatarProps, AvatarGroupProps } from './Avatar.types';
import './Avatar.css';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar(props: AvatarProps = {}): HTMLElement {
  const {
    src,
    alt = '',
    name,
    size = 'md',
    color = 'primary',
    variant = 'light',
    radius = 'full',
    classNames,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-avatar', className, classNames?.root);
  el.dataset.size = size;
  el.dataset.color = color;
  el.dataset.variant = variant;
  el.dataset.radius = radius;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', alt || name || 'Avatar');

  if (src) {
    const img = document.createElement('img');
    img.className = mergeClasses('mkt-avatar__image', classNames?.image);
    img.src = src;
    img.alt = alt || name || '';
    img.addEventListener('error', () => {
      img.remove();
      showPlaceholder();
    });
    el.appendChild(img);
  } else {
    showPlaceholder();
  }

  function showPlaceholder() {
    const placeholder = document.createElement('span');
    placeholder.className = mergeClasses('mkt-avatar__placeholder', classNames?.placeholder);

    if (name) {
      placeholder.textContent = getInitials(name);
    } else {
      // Default user icon
      placeholder.innerHTML =
        '<svg viewBox="0 0 16 16" width="60%" height="60%" fill="currentColor">' +
        '<path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14s0-4 6-4 6 4 6 4H2z"/></svg>';
    }

    el.appendChild(placeholder);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}

export function AvatarGroup(props: AvatarGroupProps): HTMLElement {
  const {
    children,
    spacing = 'sm',
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-avatar-group', className);
  el.dataset.spacing = spacing;

  children.forEach((child) => el.appendChild(child));

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
