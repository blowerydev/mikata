import { createIcon, Eye, EyeOff } from '@mikata/icons';
import { effect } from '@mikata/reactivity';
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

  const describedBy: string[] = [];
  if (description) describedBy.push(`${id}-description`);
  if (error) describedBy.push(`${id}-error`);
  if (describedBy.length) input.setAttribute('aria-describedby', describedBy.join(' '));
  if (error) input.setAttribute('aria-errormessage', `${id}-error`);

  if (typeof error === 'function') {
    effect(() => {
      if (error()) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
  } else if (error) {
    input.setAttribute('aria-invalid', 'true');
  }

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

  const updateIcon = () => {
    toggleBtn.replaceChildren(createIcon(visible ? EyeOff : Eye, { size: 16 }));
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
