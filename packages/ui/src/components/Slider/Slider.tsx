import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
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
  const initialMin = props.min ?? 0;
  const initialDefault = props.defaultValue;
  const initialValue = props.value ?? initialDefault ?? initialMin;
  const hasLabel = props.label != null;

  let updateLabel: ((val: number) => void) | undefined;

  return adoptElement<HTMLDivElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-slider', props.class, props.classNames?.root);
    });
    renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });

    if (hasLabel) {
      adoptElement<HTMLDivElement>('div', (labelRow) => {
        renderEffect(() => {
          labelRow.className = mergeClasses('mkt-slider__label', props.classNames?.label);
        });

        let labelText: HTMLSpanElement | null = null;
        let labelValue: HTMLSpanElement | null = null;
        let currentValue = initialValue;

        adoptElement<HTMLSpanElement>('span', (t) => {
          labelText = t;
          renderEffect(() => {
            const l = props.label;
            if (typeof l === 'function') t.textContent = l(currentValue);
            else t.textContent = l == null ? '' : String(l);
          });
        });

        adoptElement<HTMLSpanElement>('span', (v) => {
          labelValue = v;
          v.className = 'mkt-slider__label-value';
          if (v.textContent === '') v.textContent = String(initialValue);
        });

        updateLabel = (val: number) => {
          currentValue = val;
          if (labelText) {
            const l = props.label;
            if (typeof l === 'function') labelText.textContent = l(val);
          }
          if (labelValue) labelValue.textContent = String(val);
        };
      });
    }

    adoptElement<HTMLInputElement>('input', (input) => {
      input.setAttribute('type', 'range');
      input.id = id;
      renderEffect(() => {
        input.className = mergeClasses('mkt-slider__input', props.classNames?.input);
      });
      renderEffect(() => { input.dataset.size = props.size ?? 'md'; });
      renderEffect(() => { input.setAttribute('min', String(props.min ?? 0)); });
      renderEffect(() => { input.setAttribute('max', String(props.max ?? 100)); });
      renderEffect(() => { input.setAttribute('step', String(props.step ?? 1)); });
      renderEffect(() => { input.disabled = !!props.disabled; });

      const initial = props.value ?? initialDefault;
      if (initial != null) {
        input.setAttribute('value', String(initial));
        input.value = String(initial);
      }
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
    });
  });
}
