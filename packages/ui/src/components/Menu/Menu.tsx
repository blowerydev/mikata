import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { MenuProps, MenuItemDef } from './Menu.types';
import './Menu.css';

export function Menu(userProps: MenuProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as MenuProps;

  // `target`, `items`, `closeOnItemClick` are structural — they decide DOM
  // shape and behavior.
  const target = props.target;
  const items = props.items;
  const closeOnItemClick = props.closeOnItemClick ?? true;

  const id = uniqueId('menu');
  let isOpen = false;

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-menu', props.class, props.classNames?.root);
  });

  const targetWrapper = document.createElement('div');
  renderEffect(() => {
    targetWrapper.className = mergeClasses('mkt-menu__target', props.classNames?.target);
  });
  targetWrapper.appendChild(target);
  root.appendChild(targetWrapper);

  const dropdown = document.createElement('div');
  renderEffect(() => {
    dropdown.className = mergeClasses('mkt-menu__dropdown', props.classNames?.dropdown);
  });
  dropdown.setAttribute('role', 'menu');
  dropdown.id = id;
  renderEffect(() => { dropdown.dataset.size = props.size ?? 'sm'; });
  renderEffect(() => { dropdown.dataset.position = props.position ?? 'bottom-start'; });
  dropdown.hidden = true;

  const menuItems: HTMLElement[] = [];

  items.forEach((item: MenuItemDef, index: number) => {
    if (item.type === 'divider') {
      const divider = document.createElement('div');
      renderEffect(() => {
        divider.className = mergeClasses('mkt-menu__divider', props.classNames?.divider);
      });
      divider.setAttribute('role', 'separator');
      dropdown.appendChild(divider);
      return;
    }

    if (item.type === 'label') {
      const label = document.createElement('div');
      renderEffect(() => {
        label.className = mergeClasses('mkt-menu__label', props.classNames?.label);
      });
      renderEffect(() => {
        const l = (props.items[index] as MenuItemDef & { label: unknown })?.label;
        if (l == null) label.replaceChildren();
        else if (l instanceof Node) label.replaceChildren(l);
        else label.textContent = String(l);
      });
      dropdown.appendChild(label);
      return;
    }

    const menuItem = document.createElement('button');
    renderEffect(() => {
      menuItem.className = mergeClasses('mkt-menu__item', props.classNames?.item);
    });
    menuItem.setAttribute('role', 'menuitem');
    menuItem.type = 'button';
    menuItem.tabIndex = -1;

    if (item.disabled) {
      menuItem.disabled = true;
      menuItem.setAttribute('aria-disabled', 'true');
    }

    if (item.color) menuItem.dataset.color = item.color;

    if (item.icon) {
      const iconWrap = document.createElement('span');
      iconWrap.className = 'mkt-menu__item-icon';
      iconWrap.appendChild(item.icon);
      menuItem.appendChild(iconWrap);
    }

    const labelHost = document.createElement('span');
    labelHost.className = 'mkt-menu__item-label';
    menuItem.appendChild(labelHost);
    renderEffect(() => {
      const l = (props.items[index] as MenuItemDef & { label: unknown })?.label;
      if (l == null) labelHost.replaceChildren();
      else if (l instanceof Node) labelHost.replaceChildren(l);
      else labelHost.textContent = String(l);
    });

    menuItem.addEventListener('click', () => {
      if (item.disabled) return;
      item.onClick?.();
      if (closeOnItemClick) close();
    });

    menuItems.push(menuItem);
    dropdown.appendChild(menuItem);
  });

  root.appendChild(dropdown);

  function open() {
    if (isOpen) return;
    isOpen = true;
    dropdown.hidden = false;
    targetWrapper.querySelector('button')?.setAttribute('aria-expanded', 'true');
    const first = menuItems.find((el) => !el.hasAttribute('disabled'));
    first?.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    dropdown.hidden = true;
    targetWrapper.querySelector('button')?.setAttribute('aria-expanded', 'false');
    const targetBtn = targetWrapper.querySelector('button') || targetWrapper.firstElementChild as HTMLElement;
    targetBtn?.focus();
  }

  function toggle() {
    isOpen ? close() : open();
  }

  targetWrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  targetWrapper.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });

  dropdown.addEventListener('keydown', (e) => {
    const enabled = menuItems.filter((el) => !el.hasAttribute('disabled'));
    const currentIndex = enabled.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = enabled[(currentIndex + 1) % enabled.length];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = enabled[(currentIndex - 1 + enabled.length) % enabled.length];
      prev?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      enabled[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      enabled[enabled.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  const onDocClick = () => {
    if (isOpen) close();
  };
  document.addEventListener('click', onDocClick);
  onCleanup(() => document.removeEventListener('click', onDocClick));

  const targetBtn = targetWrapper.querySelector('button');
  if (targetBtn) {
    targetBtn.setAttribute('aria-haspopup', 'menu');
    targetBtn.setAttribute('aria-expanded', 'false');
    targetBtn.setAttribute('aria-controls', id);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
