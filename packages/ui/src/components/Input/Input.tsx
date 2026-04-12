import { mergeClasses } from '../../utils/class-merge';
import type { InputProps } from './Input.types';
import './Input.css';

export function Input(props: InputProps = {}): HTMLElement {
  const {
    type = 'text',
    value,
    defaultValue,
    placeholder,
    size = 'md',
    disabled,
    required,
    invalid,
    leftSection,
    rightSection,
    leftSectionWidth = 36,
    rightSectionWidth = 36,
    leftSectionPointerEvents = 'none',
    rightSectionPointerEvents = 'none',
    onInput,
    onChange,
    id,
    classNames,
    class: className,
    ref,
  } = props;

  const wrapper = document.createElement('div');
  wrapper.className = mergeClasses('mkt-input', className, classNames?.root);
  if (leftSection) wrapper.dataset.hasLeft = '';
  if (rightSection) wrapper.dataset.hasRight = '';
  wrapper.style.setProperty('--_input-left-w', `${leftSectionWidth}px`);
  wrapper.style.setProperty('--_input-right-w', `${rightSectionWidth}px`);

  const input = document.createElement('input');
  input.type = type;
  input.className = mergeClasses('mkt-input__input', classNames?.input);
  input.dataset.size = size;
  if (id) input.id = id;
  if (value != null) input.value = value;
  else if (defaultValue != null) input.value = defaultValue;
  if (placeholder) input.placeholder = placeholder;
  if (disabled) input.disabled = true;
  if (required) input.setAttribute('aria-required', 'true');
  if (invalid) input.setAttribute('aria-invalid', 'true');

  if (onInput) input.addEventListener('input', onInput as EventListener);
  if (onChange) input.addEventListener('change', onChange as EventListener);

  if (leftSection) {
    const section = document.createElement('span');
    section.className = mergeClasses('mkt-input__section', 'mkt-input__section--left', classNames?.section);
    section.style.pointerEvents = leftSectionPointerEvents;
    section.appendChild(leftSection);
    wrapper.appendChild(section);
  }

  wrapper.appendChild(input);

  if (rightSection) {
    const section = document.createElement('span');
    section.className = mergeClasses('mkt-input__section', 'mkt-input__section--right', classNames?.section);
    section.style.pointerEvents = rightSectionPointerEvents;
    section.appendChild(rightSection);
    wrapper.appendChild(section);
  }

  if (ref) {
    if (typeof ref === 'function') ref(input as any);
    else (ref as any).current = input;
  }

  return wrapper;
}
