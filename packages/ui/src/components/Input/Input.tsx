import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { InputProps } from './Input.types';
import './Input.css';

export function Input(userProps: InputProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as InputProps;

  // `leftSection`, `rightSection`, `type`, `id`, `defaultValue`, `onInput`,
  // `onChange`, pointerEvents settings are structural — decide DOM shape,
  // listener wiring, and one-shot attributes.
  const leftSection = props.leftSection;
  const rightSection = props.rightSection;
  const leftSectionPointerEvents = props.leftSectionPointerEvents ?? 'none';
  const rightSectionPointerEvents = props.rightSectionPointerEvents ?? 'none';
  const defaultValue = props.defaultValue;
  const onInput = props.onInput;
  const onChange = props.onChange;

  const wrapper = document.createElement('div');
  renderEffect(() => {
    wrapper.className = mergeClasses('mkt-input', props.class, props.classNames?.root);
  });
  if (leftSection) wrapper.dataset.hasLeft = '';
  if (rightSection) wrapper.dataset.hasRight = '';
  renderEffect(() => {
    wrapper.style.setProperty('--_input-left-w', `${props.leftSectionWidth ?? 36}px`);
  });
  renderEffect(() => {
    wrapper.style.setProperty('--_input-right-w', `${props.rightSectionWidth ?? 36}px`);
  });

  const input = document.createElement('input');
  input.type = props.type ?? 'text';
  renderEffect(() => {
    input.className = mergeClasses('mkt-input__input', props.classNames?.input);
  });
  renderEffect(() => { input.dataset.size = props.size ?? 'md'; });
  if (props.id) input.id = props.id;
  if (defaultValue != null) input.value = defaultValue;
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
    if (props.invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });

  if (onInput) input.addEventListener('input', onInput as EventListener);
  if (onChange) input.addEventListener('change', onChange as EventListener);

  if (leftSection) {
    const section = document.createElement('span');
    renderEffect(() => {
      section.className = mergeClasses('mkt-input__section', 'mkt-input__section--left', props.classNames?.section);
    });
    section.style.pointerEvents = leftSectionPointerEvents;
    section.appendChild(leftSection);
    wrapper.appendChild(section);
  }

  wrapper.appendChild(input);

  if (rightSection) {
    const section = document.createElement('span');
    renderEffect(() => {
      section.className = mergeClasses('mkt-input__section', 'mkt-input__section--right', props.classNames?.section);
    });
    section.style.pointerEvents = rightSectionPointerEvents;
    section.appendChild(rightSection);
    wrapper.appendChild(section);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(input);
    else (ref as { current: HTMLInputElement | null }).current = input;
  }

  return wrapper;
}
