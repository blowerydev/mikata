import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { TextInputProps } from './TextInput.types';
import './TextInput.css';

export function TextInput(props: TextInputProps = {}): HTMLDivElement {
  const {
    value,
    defaultValue,
    placeholder,
    label,
    description,
    error,
    required,
    disabled,
    size = 'md',
    leftSection,
    rightSection,
    onInput,
    onChange,
    onBlur,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('text-input');

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.className = mergeClasses('mkt-text-input__input', classNames?.input);
  input.dataset.size = size;

  if (value != null) input.value = value;
  if (defaultValue != null && value == null) input.value = defaultValue;
  if (placeholder) input.placeholder = placeholder;
  if (disabled) input.disabled = true;
  if (required) input.setAttribute('aria-required', 'true');
  if (error) input.setAttribute('aria-invalid', 'true');

  const describedBy: string[] = [];
  if (description) describedBy.push(`${id}-description`);
  if (error) describedBy.push(`${id}-error`);
  if (describedBy.length) input.setAttribute('aria-describedby', describedBy.join(' '));
  if (error) input.setAttribute('aria-errormessage', `${id}-error`);

  if (onInput) input.addEventListener('input', onInput as EventListener);
  if (onChange) input.addEventListener('change', onChange);
  if (onBlur) input.addEventListener('blur', onBlur as EventListener);

  if (ref) {
    if (typeof ref === 'function') ref(input);
    else (ref as any).current = input;
  }

  // Build wrapper div with optional sections
  const wrapper = document.createElement('div');
  wrapper.className = mergeClasses(
    'mkt-text-input',
    leftSection && 'mkt-text-input--has-left',
    rightSection && 'mkt-text-input--has-right',
  );

  if (leftSection) {
    const section = document.createElement('span');
    section.className = 'mkt-text-input__section mkt-text-input__section--left';
    section.appendChild(leftSection);
    wrapper.appendChild(section);
  }

  wrapper.appendChild(input);

  if (rightSection) {
    const section = document.createElement('span');
    section.className = 'mkt-text-input__section mkt-text-input__section--right';
    section.appendChild(rightSection);
    wrapper.appendChild(section);
  }

  return InputWrapper({
    id,
    label,
    description,
    error,
    required,
    size,
    class: className,
    classNames,
    children: wrapper,
  });
}
