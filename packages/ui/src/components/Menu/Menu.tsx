import { getCurrentScope, onCleanup, renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { MenuProps, MenuItem, MenuItemDef } from './Menu.types';
import './Menu.css';

export function Menu(userProps: MenuProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as MenuProps;

  const target = props.target;
  const items = props.items;
  const closeOnItemClick = props.closeOnItemClick ?? true;
  const actionItems = items.filter((item): item is MenuItem => item.type !== 'divider' && item.type !== 'label');

  const id = uniqueId('menu');
  let isOpen = false;
  const menuItems: HTMLElement[] = [];

  let targetWrapperRef: HTMLDivElement | null = null;
  let dropdownRef: HTMLDivElement | null = null;

  function open() {
    if (isOpen) return;
    isOpen = true;
    if (dropdownRef) dropdownRef.hidden = false;
    targetWrapperRef?.querySelector('button')?.setAttribute('aria-expanded', 'true');
    const first = menuItems.find((el) => !el.hasAttribute('disabled'));
    first?.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (dropdownRef) dropdownRef.hidden = true;
    targetWrapperRef?.querySelector('button')?.setAttribute('aria-expanded', 'false');
    const targetBtn = targetWrapperRef?.querySelector('button')
      || (targetWrapperRef?.firstElementChild as HTMLElement | null);
    targetBtn?.focus();
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-menu', props.class, props.classNames?.root);
    });

    adoptElement<HTMLDivElement>('div', (targetWrapper) => {
      targetWrapperRef = targetWrapper;
      renderEffect(() => {
        targetWrapper.className = mergeClasses('mkt-menu__target', props.classNames?.target);
      });
      if (target.parentNode !== targetWrapper) targetWrapper.appendChild(target);

      const handleTargetClick = (e: MouseEvent) => {
        e.stopPropagation();
        toggle();
      };
      const handleTargetKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      };
      targetWrapper.addEventListener('click', handleTargetClick);
      targetWrapper.addEventListener('keydown', handleTargetKeyDown);
      if (getCurrentScope()) {
        onCleanup(() => {
          targetWrapper.removeEventListener('click', handleTargetClick);
          targetWrapper.removeEventListener('keydown', handleTargetKeyDown);
        });
      }

      const targetBtn = targetWrapper.querySelector('button');
      if (targetBtn) {
        targetBtn.setAttribute('aria-haspopup', 'menu');
        targetBtn.setAttribute('aria-expanded', 'false');
        targetBtn.setAttribute('aria-controls', id);
      }
    });

    adoptElement<HTMLDivElement>('div', (dropdown) => {
      dropdownRef = dropdown;
      renderEffect(() => {
        dropdown.className = mergeClasses('mkt-menu__dropdown', props.classNames?.dropdown);
      });
      dropdown.setAttribute('role', 'menu');
      dropdown.id = id;
      renderEffect(() => { dropdown.dataset.size = props.size ?? 'sm'; });
      renderEffect(() => { dropdown.dataset.position = props.position ?? 'bottom-start'; });
      dropdown.hidden = true;

      items.forEach((item: MenuItemDef, index: number) => {
        if (item.type === 'divider') {
          adoptElement<HTMLDivElement>('div', (divider) => {
            renderEffect(() => {
              divider.className = mergeClasses('mkt-menu__divider', props.classNames?.divider);
            });
            divider.setAttribute('role', 'separator');
          });
          return;
        }

        if (item.type === 'label') {
          adoptElement<HTMLDivElement>('div', (label) => {
            renderEffect(() => {
              label.className = mergeClasses('mkt-menu__label', props.classNames?.label);
            });
            renderEffect(() => {
              const l = (props.items[index] as MenuItemDef & { label: unknown })?.label;
              if (l == null) label.replaceChildren();
              else if (l instanceof Node) label.replaceChildren(l);
              else label.textContent = String(l);
            });
          });
          return;
        }

        adoptElement<HTMLButtonElement>('button', (menuItem) => {
          renderEffect(() => {
            menuItem.className = mergeClasses('mkt-menu__item', props.classNames?.item);
          });
          menuItem.setAttribute('role', 'menuitem');
          menuItem.setAttribute('type', 'button');
          menuItem.tabIndex = -1;

          if (item.disabled) {
            menuItem.disabled = true;
            menuItem.setAttribute('aria-disabled', 'true');
          }
          if (item.color) menuItem.dataset.color = item.color;

          if (item.icon) {
            adoptElement<HTMLSpanElement>('span', (iconWrap) => {
              iconWrap.className = 'mkt-menu__item-icon';
              if (!iconWrap.firstChild) iconWrap.appendChild(item.icon!);
            });
          }

          adoptElement<HTMLSpanElement>('span', (labelHost) => {
            labelHost.className = 'mkt-menu__item-label';
            renderEffect(() => {
              const l = (props.items[index] as MenuItemDef & { label: unknown })?.label;
              if (l == null) labelHost.replaceChildren();
              else if (l instanceof Node) labelHost.replaceChildren(l);
              else labelHost.textContent = String(l);
            });
          });

          menuItems.push(menuItem);
        });
      });

      const handleDropdownClick = (e: MouseEvent) => {
        const menuItem = e.target instanceof Element
          ? e.target.closest<HTMLButtonElement>('.mkt-menu__item')
          : null;
        if (!menuItem || menuItem.disabled || !dropdown.contains(menuItem)) return;
        const index = menuItems.indexOf(menuItem);
        const item = actionItems[index];
        if (!item || item.disabled) return;
        item.onClick?.();
        if (closeOnItemClick) close();
      };

      const handleDropdownKeyDown = (e: KeyboardEvent) => {
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
      };

      dropdown.addEventListener('click', handleDropdownClick);
      dropdown.addEventListener('keydown', handleDropdownKeyDown);
      if (getCurrentScope()) {
        onCleanup(() => {
          dropdown.removeEventListener('click', handleDropdownClick);
          dropdown.removeEventListener('keydown', handleDropdownKeyDown);
        });
      }
    });

    const onDocClick = () => {
      if (isOpen) close();
    };
    document.addEventListener('click', onDocClick);
    if (getCurrentScope()) {
      onCleanup(() => document.removeEventListener('click', onDocClick));
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
