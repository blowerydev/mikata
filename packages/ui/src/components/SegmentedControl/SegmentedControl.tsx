import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { SegmentedControlProps, SegmentedControlItem } from './SegmentedControl.types';
import './SegmentedControl.css';

function normalizeItem(item: string | SegmentedControlItem): SegmentedControlItem {
  return typeof item === 'string' ? { value: item, label: item } : item;
}

export function SegmentedControl(props: SegmentedControlProps): HTMLElement {
  const {
    data,
    value,
    defaultValue,
    size = 'sm',
    color = 'primary',
    fullWidth = false,
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('segmented');
  const items = data.map(normalizeItem);
  let activeValue = value ?? defaultValue ?? items[0]?.value ?? '';

  const root = document.createElement('div');
  root.className = mergeClasses(
    'mkt-segmented-control',
    fullWidth && 'mkt-segmented-control--full-width',
    className,
    classNames?.root,
  );
  root.dataset.size = size;
  root.dataset.color = color;
  root.setAttribute('role', 'radiogroup');

  // Sliding indicator
  const indicator = document.createElement('div');
  indicator.className = mergeClasses('mkt-segmented-control__indicator', classNames?.indicator);
  root.appendChild(indicator);

  const labels: HTMLLabelElement[] = [];

  items.forEach((item, index) => {
    const inputId = `${id}-${index}`;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = id;
    input.id = inputId;
    input.value = item.value;
    input.className = mergeClasses('mkt-segmented-control__input', classNames?.input);
    input.checked = item.value === activeValue;
    if (item.disabled) input.disabled = true;

    input.addEventListener('change', () => {
      if (item.disabled) return;
      activeValue = item.value;
      onChange?.(activeValue);
      updateIndicator();
      updateActive();
    });

    root.appendChild(input);

    const label = document.createElement('label');
    label.className = mergeClasses('mkt-segmented-control__label', classNames?.label);
    label.htmlFor = inputId;
    if (item.label instanceof Node) { label.appendChild(item.label); } else { label.textContent = item.label; }
    if (item.value === activeValue) label.dataset.active = '';
    if (item.disabled) label.dataset.disabled = '';

    labels.push(label);
    root.appendChild(label);
  });

  function updateActive() {
    labels.forEach((label, i) => {
      if (items[i].value === activeValue) {
        label.dataset.active = '';
      } else {
        delete label.dataset.active;
      }
    });
  }

  function updateIndicator() {
    const activeIndex = items.findIndex((item) => item.value === activeValue);
    if (activeIndex < 0) return;
    const activeLabel = labels[activeIndex];
    if (!activeLabel) return;

    requestAnimationFrame(() => {
      // Indicator is anchored at `inset-inline-start: 0`. The X delta from there
      // to the active label depends on writing direction: in LTR, offsetLeft is
      // the physical-left distance from the container's start edge; in RTL, the
      // start edge is the right side, so we measure the label's *inline-start
      // offset from the container's inline-start edge* as
      // containerWidth - offsetLeft - offsetWidth, and translate *leftward*
      // (negative) since translateX is always physical.
      const parent = activeLabel.offsetParent as HTMLElement | null;
      const isRtl = parent ? getComputedStyle(parent).direction === 'rtl' : false;
      const startOffset = isRtl && parent
        ? -(parent.clientWidth - activeLabel.offsetLeft - activeLabel.offsetWidth)
        : activeLabel.offsetLeft;
      indicator.style.width = `${activeLabel.offsetWidth}px`;
      indicator.style.transform = `translateX(${startOffset}px)`;
    });
  }

  // Set initial indicator position after mount
  requestAnimationFrame(updateIndicator);

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
