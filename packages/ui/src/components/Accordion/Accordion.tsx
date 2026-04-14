import { createIcon, ChevronDown } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { AccordionProps } from './Accordion.types';
import './Accordion.css';

export function Accordion(userProps: AccordionProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as AccordionProps;

  // `items`, `multiple`, `chevronPosition`, `defaultValue` are structural —
  // read once at setup.
  const items = props.items;
  const multiple = props.multiple ?? false;
  const chevronPosition = props.chevronPosition ?? 'right';
  const defaultValue = props.defaultValue;

  const id = uniqueId('accordion');
  const openValues: Set<string> = new Set(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [],
  );

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-accordion', props.class, props.classNames?.root);
  });
  renderEffect(() => { root.dataset.variant = props.variant ?? 'default'; });
  renderEffect(() => { root.dataset.size = props.size ?? 'md'; });

  const controls: Map<string, HTMLButtonElement> = new Map();
  const panels: Map<string, HTMLElement> = new Map();

  items.forEach((item, index) => {
    const controlId = `${id}-control-${index}`;
    const panelId = `${id}-panel-${index}`;
    const isOpen = openValues.has(item.value);

    const itemEl = document.createElement('div');
    renderEffect(() => {
      itemEl.className = mergeClasses('mkt-accordion__item', props.classNames?.item);
    });
    if (isOpen) itemEl.dataset.active = '';

    const control = document.createElement('button');
    renderEffect(() => {
      control.className = mergeClasses('mkt-accordion__control', props.classNames?.control);
    });
    control.type = 'button';
    control.id = controlId;
    control.setAttribute('aria-expanded', String(isOpen));
    control.setAttribute('aria-controls', panelId);
    control.dataset.chevronPosition = chevronPosition;
    if (item.disabled) {
      control.disabled = true;
      control.setAttribute('aria-disabled', 'true');
    }

    const chevron = document.createElement('span');
    renderEffect(() => {
      chevron.className = mergeClasses('mkt-accordion__chevron', props.classNames?.chevron);
    });
    chevron.appendChild(createIcon(ChevronDown, { size: 16, strokeWidth: 1.5 }));
    if (isOpen) chevron.dataset.rotated = '';

    const label = document.createElement('span');
    renderEffect(() => {
      label.className = mergeClasses('mkt-accordion__label', props.classNames?.label);
    });
    renderEffect(() => {
      const l = props.items[index]?.label;
      if (l == null) label.replaceChildren();
      else if (l instanceof Node) label.replaceChildren(l);
      else label.textContent = String(l);
    });

    if (chevronPosition === 'left') {
      control.appendChild(chevron);
      control.appendChild(label);
    } else {
      control.appendChild(label);
      control.appendChild(chevron);
    }

    const panel = document.createElement('div');
    renderEffect(() => {
      panel.className = mergeClasses('mkt-accordion__panel', props.classNames?.panel);
    });
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', controlId);
    panel.id = panelId;
    panel.hidden = !isOpen;

    const panelContent = document.createElement('div');
    panelContent.className = 'mkt-accordion__panel-content';
    const content = item.content;
    if (typeof content === 'function') {
      panelContent.appendChild(content());
    } else if (content instanceof Node) {
      panelContent.appendChild(content);
    } else {
      panelContent.textContent = String(content);
    }
    panel.appendChild(panelContent);

    control.addEventListener('click', () => {
      if (item.disabled) return;
      const wasOpen = openValues.has(item.value);

      if (wasOpen) {
        openValues.delete(item.value);
      } else {
        if (!multiple) {
          openValues.forEach((v) => {
            const otherPanel = panels.get(v);
            const otherControl = controls.get(v);
            if (otherPanel) otherPanel.hidden = true;
            if (otherControl) {
              otherControl.setAttribute('aria-expanded', 'false');
              const otherChevron = otherControl.querySelector('.mkt-accordion__chevron');
              if (otherChevron) delete (otherChevron as HTMLElement).dataset.rotated;
              otherControl.closest('.mkt-accordion__item')?.removeAttribute('data-active');
            }
          });
          openValues.clear();
        }
        openValues.add(item.value);
      }

      const nowOpen = openValues.has(item.value);
      panel.hidden = !nowOpen;
      control.setAttribute('aria-expanded', String(nowOpen));
      if (nowOpen) {
        chevron.dataset.rotated = '';
        itemEl.dataset.active = '';
      } else {
        delete chevron.dataset.rotated;
        delete itemEl.dataset.active;
      }

      props.onChange?.([...openValues]);
    });

    controls.set(item.value, control);
    panels.set(item.value, panel);

    itemEl.appendChild(control);
    itemEl.appendChild(panel);
    root.appendChild(itemEl);
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
