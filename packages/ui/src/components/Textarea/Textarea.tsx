import { effect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { TextareaProps } from './Textarea.types';
import './Textarea.css';

export function Textarea(userProps: TextareaProps = {}): HTMLDivElement {
  const props = { ...useComponentDefaults<TextareaProps>('Textarea'), ...userProps };
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
    rows = 4,
    autosize,
    onInput,
    onChange,
    onBlur,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('textarea');

  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.className = mergeClasses(
    'mkt-textarea__input',
    autosize && 'mkt-textarea__input--autosize',
    classNames?.input,
  );
  textarea.dataset.size = size;
  textarea.rows = rows;

  if (value != null) textarea.value = value;
  if (defaultValue != null && value == null) textarea.value = defaultValue;
  if (placeholder) textarea.placeholder = placeholder;
  if (disabled) textarea.disabled = true;
  if (required) textarea.setAttribute('aria-required', 'true');

  const describedBy: string[] = [];
  if (description) describedBy.push(`${id}-description`);
  if (error) describedBy.push(`${id}-error`);
  if (describedBy.length) textarea.setAttribute('aria-describedby', describedBy.join(' '));
  if (error) textarea.setAttribute('aria-errormessage', `${id}-error`);

  if (typeof error === 'function') {
    effect(() => {
      if (error()) textarea.setAttribute('aria-invalid', 'true');
      else textarea.removeAttribute('aria-invalid');
    });
  } else if (error) {
    textarea.setAttribute('aria-invalid', 'true');
  }

  if (autosize) {
    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    textarea.addEventListener('input', adjustHeight);
    // Initial adjustment after insertion
    requestAnimationFrame(adjustHeight);
  }

  if (onInput) textarea.addEventListener('input', onInput as EventListener);
  if (onChange) textarea.addEventListener('change', onChange as EventListener);
  if (onBlur) textarea.addEventListener('blur', onBlur as EventListener);

  if (ref) {
    if (typeof ref === 'function') ref(textarea as any);
    else (ref as any).current = textarea;
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
    children: textarea,
  });
}
