import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
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
  // `data` defines the button set and is read once — adding/removing items at
  // runtime requires a different DOM strategy (keyed reconcile) not supported
  // here. Pass a reactive source externally and remount if it changes.
  const items = props.data.map(normalizeItem);
  let activeValue = props.value ?? props.defaultValue ?? items[0]?.value ?? '';

  const root = document.createElement('div');
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

  const indicator = document.createElement('div');
  renderEffect(() => {
    indicator.className = mergeClasses('mkt-segmented-control__indicator', props.classNames?.indicator);
  });
  root.appendChild(indicator);

  const labels: HTMLLabelElement[] = [];

  items.forEach((item, index) => {
    const inputId = `${id}-${index}`;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = id;
    input.id = inputId;
    input.value = item.value;
    renderEffect(() => {
      input.className = mergeClasses('mkt-segmented-control__input', props.classNames?.input);
    });
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
    renderEffect(() => {
      label.className = mergeClasses('mkt-segmented-control__label', props.classNames?.label);
    });
    label.htmlFor = inputId;
    renderEffect(() => {
      const raw = props.data[index];
      const norm = typeof raw === 'string' ? raw : raw?.label;
      if (norm == null) label.replaceChildren();
      else if (norm instanceof Node) label.replaceChildren(norm);
      else label.textContent = String(norm);
    });
    if (item.value === activeValue) label.dataset.active = '';
    if (item.disabled) label.dataset.disabled = '';

    labels.push(label);
    root.appendChild(label);
  });

  function updateActive() {
    labels.forEach((label, i) => {
      if (items[i].value === activeValue) label.dataset.active = '';
      else delete label.dataset.active;
    });
  }

  function updateIndicator() {
    const activeIndex = items.findIndex((item) => item.value === activeValue);
    if (activeIndex < 0) return;
    const activeLabel = labels[activeIndex];
    if (!activeLabel) return;

    requestAnimationFrame(() => {
      const parent = activeLabel.offsetParent as HTMLElement | null;
      const isRtl = parent ? getComputedStyle(parent).direction === 'rtl' : false;
      const startOffset = isRtl && parent
        ? -(parent.clientWidth - activeLabel.offsetLeft - activeLabel.offsetWidth)
        : activeLabel.offsetLeft;
      indicator.style.width = `${activeLabel.offsetWidth}px`;
      indicator.style.transform = `translateX(${startOffset}px)`;
    });
  }

  requestAnimationFrame(updateIndicator);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
