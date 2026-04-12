import { createIcon, ChevronDown } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { AccordionProps } from './Accordion.types';
import './Accordion.css';

export function Accordion(props: AccordionProps): HTMLElement {
  const {
    items,
    defaultValue,
    multiple = false,
    variant = 'default',
    size = 'md',
    chevronPosition = 'right',
    classNames,
    onChange,
    class: className,
    ref,
  } = props;

  const id = uniqueId('accordion');
  let openValues: Set<string> = new Set(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [],
  );

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-accordion', className, classNames?.root);
  root.dataset.variant = variant;
  root.dataset.size = size;

  const controls: Map<string, HTMLButtonElement> = new Map();
  const panels: Map<string, HTMLElement> = new Map();

  items.forEach((item, index) => {
    const controlId = `${id}-control-${index}`;
    const panelId = `${id}-panel-${index}`;
    const isOpen = openValues.has(item.value);

    // Item wrapper
    const itemEl = document.createElement('div');
    itemEl.className = mergeClasses('mkt-accordion__item', classNames?.item);
    if (isOpen) itemEl.dataset.active = '';

    // Control (header button)
    const control = document.createElement('button');
    control.className = mergeClasses('mkt-accordion__control', classNames?.control);
    control.type = 'button';
    control.id = controlId;
    control.setAttribute('aria-expanded', String(isOpen));
    control.setAttribute('aria-controls', panelId);
    control.dataset.chevronPosition = chevronPosition;
    if (item.disabled) {
      control.disabled = true;
      control.setAttribute('aria-disabled', 'true');
    }

    // Chevron
    const chevron = document.createElement('span');
    chevron.className = mergeClasses('mkt-accordion__chevron', classNames?.chevron);
    chevron.appendChild(createIcon(ChevronDown, { size: 16, strokeWidth: 1.5 }));
    if (isOpen) chevron.dataset.rotated = '';

    // Label
    const label = document.createElement('span');
    label.className = mergeClasses('mkt-accordion__label', classNames?.label);
    if (item.label instanceof Node) {
      label.appendChild(item.label);
    } else {
      label.textContent = item.label;
    }

    if (chevronPosition === 'left') {
      control.appendChild(chevron);
      control.appendChild(label);
    } else {
      control.appendChild(label);
      control.appendChild(chevron);
    }

    // Panel
    const panel = document.createElement('div');
    panel.className = mergeClasses('mkt-accordion__panel', classNames?.panel);
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
          // Close all others
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

      onChange?.([...openValues]);
    });

    controls.set(item.value, control);
    panels.set(item.value, panel);

    itemEl.appendChild(control);
    itemEl.appendChild(panel);
    root.appendChild(itemEl);
  });

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
