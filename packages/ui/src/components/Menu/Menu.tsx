import { mergeClasses } from '../../utils/class-merge';
import { useId } from '../../utils/use-id';
import type { MenuProps, MenuItemDef } from './Menu.types';
import './Menu.css';

export function Menu(props: MenuProps): HTMLElement {
  const {
    target,
    items,
    size = 'sm',
    position = 'bottom-start',
    closeOnItemClick = true,
    classNames,
    class: className,
    ref,
  } = props;

  const id = useId('menu');
  let isOpen = false;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-menu', className, classNames?.root);

  // Target wrapper
  const targetWrapper = document.createElement('div');
  targetWrapper.className = mergeClasses('mkt-menu__target', classNames?.target);
  targetWrapper.appendChild(target);
  root.appendChild(targetWrapper);

  // Dropdown
  const dropdown = document.createElement('div');
  dropdown.className = mergeClasses('mkt-menu__dropdown', classNames?.dropdown);
  dropdown.setAttribute('role', 'menu');
  dropdown.id = id;
  dropdown.dataset.size = size;
  dropdown.dataset.position = position;
  dropdown.hidden = true;

  const menuItems: HTMLElement[] = [];

  items.forEach((item: MenuItemDef) => {
    if (item.type === 'divider') {
      const divider = document.createElement('div');
      divider.className = mergeClasses('mkt-menu__divider', classNames?.divider);
      divider.setAttribute('role', 'separator');
      dropdown.appendChild(divider);
      return;
    }

    if (item.type === 'label') {
      const label = document.createElement('div');
      label.className = mergeClasses('mkt-menu__label', classNames?.label);
      if (item.label instanceof Node) {
        label.appendChild(item.label);
      } else {
        label.textContent = item.label;
      }
      dropdown.appendChild(label);
      return;
    }

    const menuItem = document.createElement('button');
    menuItem.className = mergeClasses('mkt-menu__item', classNames?.item);
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

    if (item.label instanceof Node) {
      menuItem.appendChild(item.label);
    } else {
      menuItem.appendChild(document.createTextNode(item.label));
    }

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
    // Focus first enabled item
    const first = menuItems.find((el) => !el.hasAttribute('disabled'));
    first?.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    dropdown.hidden = true;
    targetWrapper.querySelector('button')?.setAttribute('aria-expanded', 'false');
    // Return focus to target
    const targetBtn = targetWrapper.querySelector('button') || targetWrapper.firstElementChild as HTMLElement;
    targetBtn?.focus();
  }

  function toggle() {
    isOpen ? close() : open();
  }

  // Target click
  targetWrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  // Keyboard on target
  targetWrapper.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });

  // Keyboard navigation inside menu
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

  // Close on outside click
  const onDocClick = () => {
    if (isOpen) close();
  };
  document.addEventListener('click', onDocClick);

  // Set aria-haspopup on target button
  const targetBtn = targetWrapper.querySelector('button');
  if (targetBtn) {
    targetBtn.setAttribute('aria-haspopup', 'menu');
    targetBtn.setAttribute('aria-expanded', 'false');
    targetBtn.setAttribute('aria-controls', id);
  }

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
