import { mergeClasses } from '../../utils/class-merge';
import { useId } from '../../utils/use-id';
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

  const id = useId('segmented');
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
    label.textContent = item.label;
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

    // Use requestAnimationFrame to ensure layout is computed
    requestAnimationFrame(() => {
      // offsetLeft is relative to offsetParent (root, since it has position: relative)
      // The indicator is positioned at top: 3px (matching root padding), so left offset
      // from the label's offsetLeft works directly
      indicator.style.width = `${activeLabel.offsetWidth}px`;
      indicator.style.transform = `translateX(${activeLabel.offsetLeft}px)`;
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
