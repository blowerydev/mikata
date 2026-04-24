import { createIcon, ChevronDown } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { AccordionProps } from './Accordion.types';
import './Accordion.css';

export function Accordion(userProps: AccordionProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as AccordionProps;

  // Structural props read once; re-rendering the item set would need
  // keyed reconcile not wired up here.
  const items = props.items;
  const multiple = props.multiple ?? false;
  const chevronPosition = props.chevronPosition ?? 'right';
  const defaultValue = props.defaultValue;

  const id = uniqueId('accordion');
  const openValues: Set<string> = new Set(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [],
  );

  const controls: Map<string, HTMLButtonElement> = new Map();
  const panels: Map<string, HTMLElement> = new Map();
  const itemEls: Map<string, HTMLDivElement> = new Map();
  const chevrons: Map<string, HTMLSpanElement> = new Map();

  const handleToggle = (value: string, disabled: boolean) => {
    if (disabled) return;
    const wasOpen = openValues.has(value);

    if (wasOpen) {
      openValues.delete(value);
    } else {
      if (!multiple) {
        openValues.forEach((v) => {
          const otherPanel = panels.get(v);
          const otherControl = controls.get(v);
          const otherItem = itemEls.get(v);
          const otherChev = chevrons.get(v);
          if (otherPanel) otherPanel.hidden = true;
          if (otherControl) otherControl.setAttribute('aria-expanded', 'false');
          if (otherChev) delete otherChev.dataset.rotated;
          if (otherItem) otherItem.removeAttribute('data-active');
        });
        openValues.clear();
      }
      openValues.add(value);
    }

    const nowOpen = openValues.has(value);
    const panel = panels.get(value);
    const control = controls.get(value);
    const itemEl = itemEls.get(value);
    const chevron = chevrons.get(value);
    if (panel) panel.hidden = !nowOpen;
    if (control) control.setAttribute('aria-expanded', String(nowOpen));
    if (nowOpen) {
      if (chevron) chevron.dataset.rotated = '';
      if (itemEl) itemEl.dataset.active = '';
    } else {
      if (chevron) delete chevron.dataset.rotated;
      if (itemEl) delete itemEl.dataset.active;
    }
    props.onChange?.([...openValues]);
  };

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-accordion', props.class, props.classNames?.root);
    });
    renderEffect(() => { root.dataset.variant = props.variant ?? 'default'; });
    renderEffect(() => { root.dataset.size = props.size ?? 'md'; });

    items.forEach((item, index) => {
      const controlId = `${id}-control-${index}`;
      const panelId = `${id}-panel-${index}`;
      const isOpen = openValues.has(item.value);

      adoptElement<HTMLDivElement>('div', (itemEl) => {
        itemEls.set(item.value, itemEl);
        renderEffect(() => {
          itemEl.className = mergeClasses('mkt-accordion__item', props.classNames?.item);
        });
        if (isOpen) itemEl.dataset.active = '';

        adoptElement<HTMLButtonElement>('button', (control) => {
          controls.set(item.value, control);
          renderEffect(() => {
            control.className = mergeClasses('mkt-accordion__control', props.classNames?.control);
          });
          control.setAttribute('type', 'button');
          control.id = controlId;
          control.setAttribute('aria-expanded', String(isOpen));
          control.setAttribute('aria-controls', panelId);
          control.dataset.chevronPosition = chevronPosition;
          if (item.disabled) {
            control.disabled = true;
            control.setAttribute('aria-disabled', 'true');
          }

          // Order chevron / label based on chevronPosition - adoptElement
          // walks children in DOM order so the call order below must
          // match the SSR output.
          const emitLabel = () => {
            adoptElement<HTMLSpanElement>('span', (label) => {
              renderEffect(() => {
                label.className = mergeClasses('mkt-accordion__label', props.classNames?.label);
              });
              renderEffect(() => {
                const l = props.items[index]?.label;
                if (l == null) label.replaceChildren();
                else if (l instanceof Node) label.replaceChildren(l);
                else label.textContent = String(l);
              });
            });
          };
          const emitChevron = () => {
            adoptElement<HTMLSpanElement>('span', (chevron) => {
              chevrons.set(item.value, chevron);
              renderEffect(() => {
                chevron.className = mergeClasses('mkt-accordion__chevron', props.classNames?.chevron);
              });
              if (!chevron.firstChild) {
                chevron.appendChild(createIcon(ChevronDown, { size: 16, strokeWidth: 1.5 }));
              }
              if (isOpen) chevron.dataset.rotated = '';
            });
          };
          if (chevronPosition === 'left') { emitChevron(); emitLabel(); }
          else { emitLabel(); emitChevron(); }

          control.addEventListener('click', () => handleToggle(item.value, !!item.disabled));
        });

        adoptElement<HTMLDivElement>('div', (panel) => {
          panels.set(item.value, panel);
          renderEffect(() => {
            panel.className = mergeClasses('mkt-accordion__panel', props.classNames?.panel);
          });
          panel.setAttribute('role', 'region');
          panel.setAttribute('aria-labelledby', controlId);
          panel.id = panelId;
          panel.hidden = !isOpen;

          adoptElement<HTMLDivElement>('div', (panelContent) => {
            panelContent.className = 'mkt-accordion__panel-content';
            if (!panelContent.firstChild) {
              const content = item.content;
              if (typeof content === 'function') panelContent.appendChild(content());
              else if (content instanceof Node) panelContent.appendChild(content);
              else panelContent.textContent = String(content);
            }
          });
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
