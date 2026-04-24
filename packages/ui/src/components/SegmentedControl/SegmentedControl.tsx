import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { SegmentedControlProps, SegmentedControlItem } from './SegmentedControl.types';
import './SegmentedControl.css';

function normalizeItem(item: string | SegmentedControlItem): SegmentedControlItem {
  return typeof item === 'string' ? { value: item, label: item } : item;
}

export function SegmentedControl(userProps: SegmentedControlProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as SegmentedControlProps;

  const id = uniqueId('segmented');
  // `data` defines the button set and is read once - reactive item
  // lists need keyed reconcile, not supported here.
  const items = props.data.map(normalizeItem);
  let activeValue = props.value ?? props.defaultValue ?? items[0]?.value ?? '';

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses(
        'mkt-segmented-control',
        props.fullWidth && 'mkt-segmented-control--full-width',
        props.class,
        props.classNames?.root,
      );
    });
    renderEffect(() => { root.dataset.size = props.size ?? 'sm'; });
    renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });
    root.setAttribute('role', 'radiogroup');

    let indicatorEl: HTMLDivElement | null = null;
    adoptElement<HTMLDivElement>('div', (indicator) => {
      indicatorEl = indicator;
      renderEffect(() => {
        indicator.className = mergeClasses('mkt-segmented-control__indicator', props.classNames?.indicator);
      });
    });

    const labels: HTMLLabelElement[] = [];

    // Items list is structural. On hydration, the SSR already built
    // the radio/label pairs; we need references to the labels to move
    // the indicator later. Rather than rebuild, walk the adopted
    // children and re-wire.
    const existing = root.querySelectorAll<HTMLLabelElement>('.mkt-segmented-control__label');
    if (existing.length === items.length) {
      existing.forEach((label, i) => {
        labels.push(label);
        const input = root.querySelector<HTMLInputElement>(`#${CSS.escape(`${id}-${i}`)}`);
        if (input) {
          input.addEventListener('change', () => {
            if (items[i].disabled) return;
            activeValue = items[i].value;
            props.onChange?.(activeValue);
            updateIndicator();
            updateActive();
          });
        }
      });
    } else {
      items.forEach((item, index) => {
        const inputId = `${id}-${index}`;

        const input = document.createElement('input');
        input.setAttribute('type', 'radio');
        input.setAttribute('name', id);
        input.id = inputId;
        input.setAttribute('value', item.value);
        input.className = mergeClasses('mkt-segmented-control__input', props.classNames?.input);
        input.checked = item.value === activeValue;
        if (item.disabled) input.disabled = true;

        input.addEventListener('change', () => {
          if (item.disabled) return;
          activeValue = item.value;
          props.onChange?.(activeValue);
          updateIndicator();
          updateActive();
        });

        root.appendChild(input);

        const label = document.createElement('label');
        label.className = mergeClasses('mkt-segmented-control__label', props.classNames?.label);
        label.htmlFor = inputId;
        const norm = typeof props.data[index] === 'string'
          ? (props.data[index] as string)
          : (props.data[index] as SegmentedControlItem)?.label;
        if (norm == null) label.replaceChildren();
        else if (norm instanceof Node) label.replaceChildren(norm);
        else label.textContent = String(norm);
        if (item.value === activeValue) label.dataset.active = '';
        if (item.disabled) label.dataset.disabled = '';

        labels.push(label);
        root.appendChild(label);
      });
    }

    function updateActive() {
      labels.forEach((label, i) => {
        if (items[i].value === activeValue) label.dataset.active = '';
        else delete label.dataset.active;
      });
    }

    function updateIndicator() {
      if (!indicatorEl) return;
      const activeIndex = items.findIndex((item) => item.value === activeValue);
      if (activeIndex < 0) return;
      const activeLabel = labels[activeIndex];
      if (!activeLabel) return;

      requestAnimationFrame(() => {
        if (!indicatorEl) return;
        const parent = activeLabel.offsetParent as HTMLElement | null;
        const isRtl = parent ? getComputedStyle(parent).direction === 'rtl' : false;
        const startOffset = isRtl && parent
          ? -(parent.clientWidth - activeLabel.offsetLeft - activeLabel.offsetWidth)
          : activeLabel.offsetLeft;
        indicatorEl.style.width = `${activeLabel.offsetWidth}px`;
        indicatorEl.style.transform = `translateX(${startOffset}px)`;
      });
    }

    requestAnimationFrame(updateIndicator);

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
