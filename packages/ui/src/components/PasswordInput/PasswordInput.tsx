import { createIcon, Eye, EyeOff } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { useUILabels } from '../../utils/use-i18n-optional';
import { InputWrapper } from '../_internal/InputWrapper';
import type { PasswordInputProps } from './PasswordInput.types';
import './PasswordInput.css';

export function PasswordInput(userProps: PasswordInputProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<PasswordInputProps>('PasswordInput') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as PasswordInputProps;

  const id = uniqueId('password-input');
  const labels = useUILabels();
  let visible = false;

  const input = document.createElement('input');
  input.type = 'password';
  input.id = id;
  renderEffect(() => {
    input.className = mergeClasses('mkt-password-input__input', props.classNames?.input);
  });
  renderEffect(() => { input.dataset.size = props.size ?? 'md'; });

  if (props.value != null) input.value = props.value;
  else if (props.defaultValue != null) input.value = props.defaultValue;
  renderEffect(() => {
    const v = props.value;
    if (v != null && input.value !== v) input.value = v;
  });

  renderEffect(() => {
    const p = props.placeholder;
    if (p) input.placeholder = p;
    else input.removeAttribute('placeholder');
  });
  renderEffect(() => { input.disabled = !!props.disabled; });
  renderEffect(() => {
    if (props.required) input.setAttribute('aria-required', 'true');
    else input.removeAttribute('aria-required');
  });

  renderEffect(() => {
    const parts: string[] = [];
    if (props.description) parts.push(`${id}-description`);
    if (hasError(props.error)) parts.push(`${id}-error`);
    if (parts.length) input.setAttribute('aria-describedby', parts.join(' '));
    else input.removeAttribute('aria-describedby');
  });
  renderEffect(() => {
    if (hasError(props.error)) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-errormessage', `${id}-error`);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-errormessage');
    }
  });

  const onInput = props.onInput;
  if (onInput) input.addEventListener('input', onInput as EventListener);
  const onChange = props.onChange;
  if (onChange) input.addEventListener('change', onChange as EventListener);
  const onBlur = props.onBlur;
  if (onBlur) input.addEventListener('blur', onBlur as EventListener);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(input as unknown as HTMLElement);
    else (ref as { current: HTMLInputElement | null }).current = input;
  }

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.tabIndex = -1;
  renderEffect(() => {
    toggleBtn.className = mergeClasses('mkt-password-input__toggle', props.classNames?.toggleButton);
  });
  toggleBtn.setAttribute('aria-label', labels.showPassword);

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

  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-password-input';
  wrapper.appendChild(input);
  wrapper.appendChild(toggleBtn);

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: wrapper,
  });
}

function hasError(err: unknown): boolean {
  if (err == null || err === false || err === '') return false;
  if (typeof err === 'function') {
    const v = (err as () => unknown)();
    return v != null && v !== false && v !== '';
  }
  return true;
}
