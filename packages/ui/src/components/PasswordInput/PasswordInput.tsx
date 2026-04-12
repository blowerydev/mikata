import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { useUILabels } from '../../utils/use-i18n-optional';
import { InputWrapper } from '../_internal/InputWrapper';
import type { PasswordInputProps } from './PasswordInput.types';
import './PasswordInput.css';

export function PasswordInput(props: PasswordInputProps = {}): HTMLDivElement {
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
    onInput,
    onChange,
    onBlur,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('password-input');
  const labels = useUILabels();
  let visible = false;

  const input = document.createElement('input');
  input.type = 'password';
  input.id = id;
  input.className = mergeClasses('mkt-password-input__input', classNames?.input);
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

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = mergeClasses('mkt-password-input__toggle', classNames?.toggleButton);
  toggleBtn.setAttribute('aria-label', labels.showPassword);
  toggleBtn.tabIndex = -1;

  // Eye icon SVG
  const updateIcon = () => {
    if (visible) {
      toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
      toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
  };
  updateIcon();

  toggleBtn.addEventListener('click', () => {
    visible = !visible;
    input.type = visible ? 'text' : 'password';
    toggleBtn.setAttribute('aria-label', visible ? labels.hidePassword : labels.showPassword);
    updateIcon();
  });

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-password-input';
  wrapper.appendChild(input);
  wrapper.appendChild(toggleBtn);

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
