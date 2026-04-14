import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import type { SliderProps } from './Slider.types';
import './Slider.css';

export function Slider(userProps: SliderProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<SliderProps>('Slider') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as SliderProps;

  const id = uniqueId('slider');

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-slider', props.class, props.classNames?.root);
  });
  renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });

  const initialMin = props.min ?? 0;
  const initialDefault = props.defaultValue;
  const initialValue = props.value ?? initialDefault ?? initialMin;

  let updateLabel: ((val: number) => void) | undefined;

  // Label row: presence is decided by the initial read; the label's
  // content is re-read lazily so locale-reactive strings update.
  const hasLabel = props.label != null;
  if (hasLabel) {
    const labelRow = document.createElement('div');
    renderEffect(() => {
      labelRow.className = mergeClasses('mkt-slider__label', props.classNames?.label);
    });

    const labelText = document.createElement('span');
    let currentValue = initialValue;
    renderEffect(() => {
      const l = props.label;
      if (typeof l === 'function') labelText.textContent = l(currentValue);
      else labelText.textContent = l == null ? '' : String(l);
    });
    labelRow.appendChild(labelText);

    const labelValue = document.createElement('span');
    labelValue.className = 'mkt-slider__label-value';
    labelValue.textContent = String(initialValue);
    labelRow.appendChild(labelValue);

    root.appendChild(labelRow);

    updateLabel = (val: number) => {
      currentValue = val;
      const l = props.label;
      if (typeof l === 'function') labelText.textContent = l(val);
      labelValue.textContent = String(val);
    };
  }

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  renderEffect(() => {
    input.className = mergeClasses('mkt-slider__input', props.classNames?.input);
  });
  renderEffect(() => { input.dataset.size = props.size ?? 'md'; });
  renderEffect(() => { input.min = String(props.min ?? 0); });
  renderEffect(() => { input.max = String(props.max ?? 100); });
  renderEffect(() => { input.step = String(props.step ?? 1); });
  renderEffect(() => { input.disabled = !!props.disabled; });

  if (props.value != null) input.value = String(props.value);
  else if (initialDefault != null) input.value = String(initialDefault);
  renderEffect(() => {
    const v = props.value;
    if (v != null && input.value !== String(v)) input.value = String(v);
  });

  input.addEventListener('input', () => {
    const num = parseFloat(input.value);
    props.onValueChange?.(num);
    if (updateLabel) updateLabel(num);
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(input as unknown as HTMLElement);
    else (ref as { current: HTMLInputElement | null }).current = input;
  }

  root.appendChild(input);

  return root as HTMLDivElement;
}
