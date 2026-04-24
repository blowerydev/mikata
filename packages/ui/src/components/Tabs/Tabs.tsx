import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { directionalArrowKeys } from '../../utils/direction';
import { useDirection } from '../../theme';
import type { TabsProps } from './Tabs.types';
import './Tabs.css';

export function Tabs(userProps: TabsProps): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<TabsProps>('Tabs') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as TabsProps;

  const items = props.items;
  const orientation = props.orientation ?? 'horizontal';

  const id = uniqueId('tabs');
  const direction = useDirection();
  let activeValue = props.value ?? props.defaultValue ?? items[0]?.value ?? '';

  const tabButtons: HTMLButtonElement[] = [];
  const panels: HTMLElement[] = [];

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
    props.onChange?.(activeValue);
  }

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-tabs', props.class, props.classNames?.root);
    });
    renderEffect(() => { root.dataset.variant = props.variant ?? 'default'; });
    renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });
    root.dataset.orientation = orientation;

    adoptElement<HTMLDivElement>('div', (tabList) => {
      renderEffect(() => {
        tabList.className = mergeClasses('mkt-tabs__list', props.classNames?.list);
      });
      tabList.setAttribute('role', 'tablist');
      tabList.setAttribute('aria-orientation', orientation);
      renderEffect(() => { tabList.dataset.size = props.size ?? 'md'; });

      items.forEach((item, index) => {
        const tabId = `${id}-tab-${index}`;
        const panelId = `${id}-panel-${index}`;
        const isActive = item.value === activeValue;

        adoptElement<HTMLButtonElement>('button', (tab) => {
          renderEffect(() => {
            tab.className = mergeClasses('mkt-tabs__tab', props.classNames?.tab);
          });
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-selected', String(isActive));
          tab.setAttribute('aria-controls', panelId);
          tab.id = tabId;
          tab.setAttribute('type', 'button');
          tab.tabIndex = isActive ? 0 : -1;

          if (item.disabled) {
            tab.disabled = true;
            tab.setAttribute('aria-disabled', 'true');
          }
          if (isActive) tab.dataset.active = '';

          if (item.icon) {
            adoptElement<HTMLSpanElement>('span', (iconWrap) => {
              iconWrap.className = 'mkt-tabs__tab-icon';
              if (!iconWrap.firstChild) iconWrap.appendChild(item.icon!);
            });
          }

          adoptElement<HTMLSpanElement>('span', (labelHost) => {
            labelHost.className = 'mkt-tabs__tab-label';
            renderEffect(() => {
              const current = props.items[index]?.label;
              if (current == null) { labelHost.replaceChildren(); return; }
              if (current instanceof Node) labelHost.replaceChildren(current);
              else labelHost.textContent = String(current);
            });
          });

          tab.addEventListener('click', () => {
            if (item.disabled) return;
            activate(index);
          });

          tabButtons.push(tab);
        });
      });

      tabList.addEventListener('keydown', (e) => {
        const enabledIndices = items
          .map((item, i) => (item.disabled ? -1 : i))
          .filter((i) => i >= 0);
        const currentIndex = enabledIndices.indexOf(
          tabButtons.indexOf(document.activeElement as HTMLButtonElement),
        );
        if (currentIndex < 0) return;

        const isHorizontal = orientation === 'horizontal';
        const { prevKey, nextKey } = directionalArrowKeys(isHorizontal, direction());
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
    });

    adoptElement<HTMLDivElement>('div', (_panelsContainer) => {
      // Container was a styleless wrapper in the original imperative
      // implementation; preserved here for structural parity (no
      // className so no surprise styling).

      items.forEach((item, index) => {
        const tabId = `${id}-tab-${index}`;
        const panelId = `${id}-panel-${index}`;
        const isActive = item.value === activeValue;

        adoptElement<HTMLDivElement>('div', (panel) => {
          renderEffect(() => {
            panel.className = mergeClasses('mkt-tabs__panel', props.classNames?.panel);
          });
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', tabId);
          panel.id = panelId;
          panel.tabIndex = 0;
          panel.hidden = !isActive;

          if (!panel.firstChild) {
            const content = item.content;
            if (typeof content === 'function') panel.appendChild(content());
            else if (content instanceof Node) panel.appendChild(content);
            else panel.textContent = String(content);
          }

          panels.push(panel);
        });
      });
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
