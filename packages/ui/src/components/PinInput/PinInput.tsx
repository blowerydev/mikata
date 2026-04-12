import { mergeClasses } from '../../utils/class-merge';
import type { PinInputProps } from './PinInput.types';
import './PinInput.css';

export function PinInput(props: PinInputProps = {}): HTMLElement {
  const {
    length = 4,
    value,
    defaultValue,
    placeholder = '○',
    size = 'md',
    type = 'number',
    mask,
    disabled,
    error,
    onChange,
    onComplete,
    autoFocus,
    classNames,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-pin-input', className, classNames?.root);
  root.dataset.size = size;
  if (error) root.dataset.error = '';

  const inputs: HTMLInputElement[] = [];
  const initial = (value ?? defaultValue ?? '').split('');

  const pattern = type === 'number' ? /^[0-9]$/ : /^[a-zA-Z0-9]$/;

  const emit = () => {
    const v = inputs.map((i) => i.value).join('');
    onChange?.(v);
    if (v.length === length) onComplete?.(v);
  };

  for (let i = 0; i < length; i++) {
    const input = document.createElement('input');
    input.type = mask ? 'password' : 'text';
    input.inputMode = type === 'number' ? 'numeric' : 'text';
    input.maxLength = 1;
    input.autocomplete = i === 0 ? 'one-time-code' : 'off';
    input.className = mergeClasses('mkt-pin-input__input', classNames?.input);
    input.dataset.size = size;
    if (error) input.setAttribute('aria-invalid', 'true');
    if (disabled) input.disabled = true;
    if (placeholder) input.placeholder = placeholder;
    if (initial[i]) input.value = initial[i];

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const ch = target.value;
      if (ch && !pattern.test(ch)) {
        target.value = '';
        return;
      }
      if (ch && i < length - 1) inputs[i + 1].focus();
      emit();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        inputs[i - 1].focus();
      } else if (e.key === 'ArrowLeft' && i > 0) {
        inputs[i - 1].focus();
      } else if (e.key === 'ArrowRight' && i < length - 1) {
        inputs[i + 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const data = (e.clipboardData?.getData('text') ?? '').replace(/\s/g, '');
      const cleaned = [...data].filter((c) => pattern.test(c));
      for (let j = 0; j < cleaned.length && i + j < length; j++) {
        inputs[i + j].value = cleaned[j];
      }
      const lastIdx = Math.min(i + cleaned.length, length - 1);
      inputs[lastIdx].focus();
      emit();
    });

    inputs.push(input);
    root.appendChild(input);
  }

  if (autoFocus) requestAnimationFrame(() => inputs[0]?.focus());

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
