import { createIcon, ChevronRight } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import type { NavLinkProps } from './NavLink.types';
import './NavLink.css';

export function NavLink(props: NavLinkProps): HTMLElement {
  const {
    label,
    description,
    icon,
    active = false,
    disabled = false,
    variant = 'light',
    color = 'primary',
    href,
    onClick,
    opened,
    defaultOpened = false,
    children,
    classNames,
    class: className,
    ref,
  } = props;

  const hasChildren = children && children.length > 0;
  let isOpen = opened ?? defaultOpened;

  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-navlink-wrapper';

  // Main link element
  const el = document.createElement(href ? 'a' : 'button') as HTMLElement;
  el.className = mergeClasses(
    'mkt-navlink',
    active && 'mkt-navlink--active',
    disabled && 'mkt-navlink--disabled',
    className,
    classNames?.root,
  );
  el.dataset.variant = variant;
  el.dataset.color = color;

  if (href) {
    (el as HTMLAnchorElement).href = href;
  } else {
    (el as HTMLButtonElement).type = 'button';
  }

  if (disabled) {
    if (el instanceof HTMLButtonElement) el.disabled = true;
    el.setAttribute('aria-disabled', 'true');
  }

  // Icon
  if (icon) {
    const iconWrap = document.createElement('span');
    iconWrap.className = mergeClasses('mkt-navlink__icon', classNames?.icon);
    iconWrap.appendChild(icon);
    el.appendChild(iconWrap);
  }

  // Text content
  const textWrap = document.createElement('div');
  textWrap.className = 'mkt-navlink__body';

  const labelEl = document.createElement('span');
  labelEl.className = mergeClasses('mkt-navlink__label', classNames?.label);
  if (label instanceof Node) { labelEl.appendChild(label); } else { labelEl.textContent = label; }
  textWrap.appendChild(labelEl);

  if (description) {
    const descEl = document.createElement('span');
    descEl.className = mergeClasses('mkt-navlink__description', classNames?.description);
    if (description instanceof Node) { descEl.appendChild(description); } else { descEl.textContent = description; }
    textWrap.appendChild(descEl);
  }

  el.appendChild(textWrap);

  // Chevron for nested items
  if (hasChildren) {
    const chevron = document.createElement('span');
    chevron.className = mergeClasses('mkt-navlink__chevron', classNames?.chevron);
    chevron.appendChild(createIcon(ChevronRight, { size: 14, strokeWidth: 1.5 }));
    if (isOpen) chevron.dataset.rotated = '';
    el.appendChild(chevron);

    el.setAttribute('aria-expanded', String(isOpen));
  }

  // Click handler
  el.addEventListener('click', (e) => {
    if (disabled) return;

    if (hasChildren) {
      isOpen = !isOpen;
      el.setAttribute('aria-expanded', String(isOpen));
      const chevron = el.querySelector('.mkt-navlink__chevron');
      if (chevron) {
        if (isOpen) (chevron as HTMLElement).dataset.rotated = '';
        else delete (chevron as HTMLElement).dataset.rotated;
      }
      if (childContainer) childContainer.hidden = !isOpen;
    }

    onClick?.(e as MouseEvent);
  });

  wrapper.appendChild(el);

  // Nested children
  let childContainer: HTMLElement | null = null;
  if (hasChildren) {
    childContainer = document.createElement('div');
    childContainer.className = mergeClasses('mkt-navlink__children', classNames?.children);
    childContainer.hidden = !isOpen;

    children!.forEach((child) => childContainer!.appendChild(child));
    wrapper.appendChild(childContainer);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return hasChildren ? wrapper : el;
}
