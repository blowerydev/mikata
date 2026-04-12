import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import type { TabsProps } from './Tabs.types';
import './Tabs.css';

export function Tabs(userProps: TabsProps): HTMLElement {
  const props = { ...useComponentDefaults<TabsProps>('Tabs'), ...userProps };
  const {
    items,
    defaultValue,
    value,
    variant = 'default',
    size = 'md',
    color = 'primary',
    orientation = 'horizontal',
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('tabs');
  let activeValue = value ?? defaultValue ?? items[0]?.value ?? '';

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-tabs', className, classNames?.root);
  root.dataset.variant = variant;
  root.dataset.orientation = orientation;
  root.dataset.color = color;

  // Tab list
  const tabList = document.createElement('div');
  tabList.className = mergeClasses('mkt-tabs__list', classNames?.list);
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-orientation', orientation);
  tabList.dataset.size = size;

  // Panels container
  const panelsContainer = document.createElement('div');

  const tabButtons: HTMLButtonElement[] = [];
  const panels: HTMLElement[] = [];

  items.forEach((item, index) => {
    const tabId = `${id}-tab-${index}`;
    const panelId = `${id}-panel-${index}`;
    const isActive = item.value === activeValue;

    // Tab button
    const tab = document.createElement('button');
    tab.className = mergeClasses('mkt-tabs__tab', classNames?.tab);
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(isActive));
    tab.setAttribute('aria-controls', panelId);
    tab.id = tabId;
    tab.type = 'button';
    tab.tabIndex = isActive ? 0 : -1;

    if (item.disabled) {
      tab.disabled = true;
      tab.setAttribute('aria-disabled', 'true');
    }

    if (isActive) tab.dataset.active = '';

    if (item.icon) {
      const iconWrap = document.createElement('span');
      iconWrap.className = 'mkt-tabs__tab-icon';
      iconWrap.appendChild(item.icon);
      tab.appendChild(iconWrap);
    }

    if (typeof item.label === 'string') {
      const labelSpan = document.createTextNode(item.label);
      tab.appendChild(labelSpan);
    } else {
      tab.appendChild(item.label);
    }

    tab.addEventListener('click', () => {
      if (item.disabled) return;
      activate(index);
    });

    tabButtons.push(tab);
    tabList.appendChild(tab);

    // Panel
    const panel = document.createElement('div');
    panel.className = mergeClasses('mkt-tabs__panel', classNames?.panel);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.id = panelId;
    panel.tabIndex = 0;
    panel.hidden = !isActive;

    const content = item.content;
    if (typeof content === 'function') {
      panel.appendChild(content());
    } else if (content instanceof Node) {
      panel.appendChild(content);
    } else {
      panel.textContent = String(content);
    }

    panels.push(panel);
    panelsContainer.appendChild(panel);
  });

  // Keyboard navigation
  tabList.addEventListener('keydown', (e) => {
    const enabledIndices = items
      .map((item, i) => (item.disabled ? -1 : i))
      .filter((i) => i >= 0);
    const currentIndex = enabledIndices.indexOf(
      tabButtons.indexOf(document.activeElement as HTMLButtonElement),
    );
    if (currentIndex < 0) return;

    const isHorizontal = orientation === 'horizontal';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    let newIndex = -1;

    if (e.key === nextKey) {
      newIndex = enabledIndices[(currentIndex + 1) % enabledIndices.length];
      e.preventDefault();
    } else if (e.key === prevKey) {
      newIndex = enabledIndices[(currentIndex - 1 + enabledIndices.length) % enabledIndices.length];
      e.preventDefault();
    } else if (e.key === 'Home') {
      newIndex = enabledIndices[0];
      e.preventDefault();
    } else if (e.key === 'End') {
      newIndex = enabledIndices[enabledIndices.length - 1];
      e.preventDefault();
    }

    if (newIndex >= 0) {
      activate(newIndex);
      tabButtons[newIndex].focus();
    }
  });

  function activate(index: number) {
    tabButtons.forEach((btn, i) => {
      const active = i === index;
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
      if (active) btn.dataset.active = '';
      else delete btn.dataset.active;
    });
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
    activeValue = items[index].value;
    onChange?.(activeValue);
  }

  root.appendChild(tabList);
  root.appendChild(panelsContainer);

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
