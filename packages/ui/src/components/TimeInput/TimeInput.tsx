import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { TimeInputProps } from './TimeInput.types';
import '../TextInput/TextInput.css';

/**
 * TimeInput - thin wrapper over a native `<input type="time">`. Browsers
 * render locale-aware hour/minute fields and handle 12/24h formatting
 * automatically based on the user's system. `withSeconds` toggles the
 * seconds field via the `step` attribute.
 */
export function TimeInput(userProps: TimeInputProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<TimeInputProps>('TimeInput') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as TimeInputProps;

  const defaultValue = props.defaultValue;
  const onChange = props.onChange;

  const id = uniqueId('time-input');

  const buildWrapper = () =>
    adoptElement<HTMLDivElement>('div', (wrapper) => {
      wrapper.className = 'mkt-text-input';

      adoptElement<HTMLInputElement>('input', (input) => {
        input.type = 'time';
        input.id = id;
        renderEffect(() => {
          input.className = mergeClasses('mkt-text-input__input', props.classNames?.input);
        });
        renderEffect(() => { input.dataset.size = props.size ?? 'md'; });

        if (props.value == null && defaultValue != null) input.value = defaultValue;
        renderEffect(() => {
          const v = props.value;
          if (v != null && v !== input.value) input.value = v;
        });
        renderEffect(() => { input.disabled = !!props.disabled; });
        renderEffect(() => {
          if (props.required) input.setAttribute('aria-required', 'true');
          else input.removeAttribute('aria-required');
        });
        renderEffect(() => { input.min = props.min ?? ''; });
        renderEffect(() => { input.max = props.max ?? ''; });
        renderEffect(() => {
          const step = props.step;
          if (step != null) input.step = String(step);
          else if (props.withSeconds) input.step = '1';
          else input.step = '';
        });

        if (onChange) {
          input.addEventListener('change', () => onChange(input.value));
          input.addEventListener('input', () => onChange(input.value));
        }

        const ref = props.ref;
        if (ref) {
          if (typeof ref === 'function') ref(input as unknown as HTMLDivElement);
          else (ref as { current: HTMLInputElement | null }).current = input;
        }
      });
    });

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size ?? 'md'; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: buildWrapper,
  });
}
