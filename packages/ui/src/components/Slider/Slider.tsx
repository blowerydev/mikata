import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { SliderProps } from './Slider.types';
import './Slider.css';

export function Slider(props: SliderProps = {}): HTMLDivElement {
  const {
    value,
    defaultValue,
    min = 0,
    max = 100,
    step = 1,
    color = 'primary',
    size = 'md',
    label,
    disabled,
    onValueChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('slider');

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-slider', className, classNames?.root);
  root.dataset.color = color;

  let updateLabel: ((val: number) => void) | undefined;

  // Label row
  if (label) {
    const labelRow = document.createElement('div');
    labelRow.className = mergeClasses('mkt-slider__label', classNames?.label);

    const labelText = document.createElement('span');
    const currentVal = value ?? defaultValue ?? min;
    labelText.textContent = typeof label === 'function' ? label(currentVal) : label;
    labelRow.appendChild(labelText);

    const labelValue = document.createElement('span');
    labelValue.className = 'mkt-slider__label-value';
    labelValue.textContent = String(currentVal);
    labelRow.appendChild(labelValue);

    root.appendChild(labelRow);

    updateLabel = (val: number) => {
      if (typeof label === 'function') {
        labelText.textContent = label(val);
      }
      labelValue.textContent = String(val);
    };
  }

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.className = mergeClasses('mkt-slider__input', classNames?.input);
  input.dataset.size = size;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);

  if (value != null) input.value = String(value);
  else if (defaultValue != null) input.value = String(defaultValue);

  if (disabled) input.disabled = true;

  input.addEventListener('input', () => {
    const num = parseFloat(input.value);
    if (onValueChange) onValueChange(num);
    if (updateLabel) updateLabel(num);
  });

  if (ref) {
    if (typeof ref === 'function') ref(input);
    else (ref as any).current = input;
  }

  root.appendChild(input);

  return root;
}
