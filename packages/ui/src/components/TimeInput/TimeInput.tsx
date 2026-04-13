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
  const props = { ...useComponentDefaults<TimeInputProps>('TimeInput'), ...userProps };
  const {
    value, defaultValue, label, description, error, required, disabled,
    withSeconds = false, step, min, max, size = 'md',
    onChange, classNames, class: className, ref,
  } = props;

  const id = uniqueId('time-input');

  const input = document.createElement('input');
  input.type = 'time';
  input.id = id;
  input.className = mergeClasses('mkt-text-input__input', classNames?.input);
  input.dataset.size = size;

  if (value != null) input.value = value;
  if (defaultValue != null && value == null) input.value = defaultValue;
  if (disabled) input.disabled = true;
  if (required) input.setAttribute('aria-required', 'true');
  if (min) input.min = min;
  if (max) input.max = max;
  if (step != null) input.step = String(step);
  else if (withSeconds) input.step = '1';

  if (onChange) {
    input.addEventListener('change', () => onChange(input.value));
    input.addEventListener('input', () => onChange(input.value));
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-text-input';
  wrapper.appendChild(input);

  if (ref) {
    if (typeof ref === 'function') ref(input as unknown as HTMLDivElement);
    else (ref as { current: HTMLInputElement | null }).current = input;
  }

  return InputWrapper({
    id, label, description, error, required, size,
    class: className, classNames, children: wrapper,
  });
}
