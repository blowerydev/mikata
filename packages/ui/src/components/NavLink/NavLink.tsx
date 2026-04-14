import { createIcon, ChevronRight } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { NavLinkProps } from './NavLink.types';
import './NavLink.css';

export function NavLink(userProps: NavLinkProps): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<NavLinkProps>('NavLink') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as NavLinkProps;

  // `href`, `children`, `icon`, `description` are structural — they decide
  // the tag name, and whether the chevron/nested container exists.
  const href = props.href;
  const icon = props.icon;
  const description = props.description;
  const children = props.children;
  const hasChildren = children && children.length > 0;
  let isOpen = props.opened ?? props.defaultOpened ?? false;

  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-navlink-wrapper';

  const el = document.createElement(href ? 'a' : 'button') as HTMLElement;
  renderEffect(() => {
    el.className = mergeClasses(
      'mkt-navlink',
      props.active && 'mkt-navlink--active',
      props.disabled && 'mkt-navlink--disabled',
      props.class,
      props.classNames?.root,
    );
  });
  renderEffect(() => { el.dataset.variant = props.variant ?? 'light'; });
  renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });

  if (href) {
    (el as HTMLAnchorElement).href = href;
  } else {
    (el as HTMLButtonElement).type = 'button';
  }

  renderEffect(() => {
    const disabled = !!props.disabled;
    if (el instanceof HTMLButtonElement) el.disabled = disabled;
    if (disabled) el.setAttribute('aria-disabled', 'true');
    else el.removeAttribute('aria-disabled');
  });

  if (icon) {
    const iconWrap = document.createElement('span');
    renderEffect(() => {
      iconWrap.className = mergeClasses('mkt-navlink__icon', props.classNames?.icon);
    });
    iconWrap.appendChild(icon);
    el.appendChild(iconWrap);
  }

  const textWrap = document.createElement('div');
  textWrap.className = 'mkt-navlink__body';

  const labelEl = document.createElement('span');
  renderEffect(() => {
    labelEl.className = mergeClasses('mkt-navlink__label', props.classNames?.label);
  });
  renderEffect(() => {
    const l = props.label;
    labelEl.replaceChildren();
    if (l instanceof Node) labelEl.appendChild(l);
    else if (l != null) labelEl.textContent = String(l);
  });
  textWrap.appendChild(labelEl);

  if (description) {
    const descEl = document.createElement('span');
    renderEffect(() => {
      descEl.className = mergeClasses('mkt-navlink__description', props.classNames?.description);
    });
    renderEffect(() => {
      const d = props.description;
      if (d == null) descEl.replaceChildren();
      else if (d instanceof Node) descEl.replaceChildren(d);
      else descEl.textContent = d;
    });
    textWrap.appendChild(descEl);
  }

  el.appendChild(textWrap);

  let chevron: HTMLElement | null = null;
  if (hasChildren) {
    chevron = document.createElement('span');
    renderEffect(() => {
      chevron!.className = mergeClasses('mkt-navlink__chevron', props.classNames?.chevron);
    });
    chevron.appendChild(createIcon(ChevronRight, { size: 14, strokeWidth: 1.5 }));
    if (isOpen) chevron.dataset.rotated = '';
    el.appendChild(chevron);
    el.setAttribute('aria-expanded', String(isOpen));
  }

  el.addEventListener('click', (e) => {
    if (props.disabled) return;

    if (hasChildren) {
      isOpen = !isOpen;
      el.setAttribute('aria-expanded', String(isOpen));
      if (chevron) {
        if (isOpen) chevron.dataset.rotated = '';
        else delete chevron.dataset.rotated;
      }
      if (childContainer) childContainer.hidden = !isOpen;
    }

    props.onClick?.(e as MouseEvent);
  });

  wrapper.appendChild(el);

  let childContainer: HTMLElement | null = null;
  if (hasChildren) {
    childContainer = document.createElement('div');
    renderEffect(() => {
      childContainer!.className = mergeClasses('mkt-navlink__children', props.classNames?.children);
    });
    childContainer.hidden = !isOpen;
    children!.forEach((child) => childContainer!.appendChild(child));
    wrapper.appendChild(childContainer);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return hasChildren ? wrapper : el;
}
