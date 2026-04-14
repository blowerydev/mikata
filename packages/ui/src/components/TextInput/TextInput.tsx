import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { TextInputProps } from './TextInput.types';
import './TextInput.css';

export function TextInput(userProps: TextInputProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<TextInputProps>('TextInput') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as TextInputProps;

  const id = uniqueId('text-input');

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  renderEffect(() => {
    input.className = mergeClasses('mkt-text-input__input', props.classNames?.input);
  });
  renderEffect(() => { input.dataset.size = props.size ?? 'md'; });

  // Initial value wiring: prefer controlled `value`, fall back to defaultValue.
  if (props.value != null) input.value = props.value;
  else if (props.defaultValue != null) input.value = props.defaultValue;

  // Controlled value — only re-apply on external changes, and skip when it
  // already matches to avoid caret jumps on each keystroke.
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
      input.setAttribute('aria-errormessage', `${id}-error`);
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-errormessage');
      input.removeAttribute('aria-invalid');
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
    if (typeof ref === 'function') ref(input);
    else (ref as { current: HTMLInputElement | null }).current = input;
  }

  // Wrapper with optional left/right sections.
  const wrapper = document.createElement('div');
  renderEffect(() => {
    wrapper.className = mergeClasses(
      'mkt-text-input',
      props.leftSection && 'mkt-text-input--has-left',
      props.rightSection && 'mkt-text-input--has-right',
    );
  });

  // Sections are wired once — they're typically static icon nodes.
  const leftSection = props.leftSection;
  if (leftSection) {
    const section = document.createElement('span');
    section.className = 'mkt-text-input__section mkt-text-input__section--left';
    section.appendChild(leftSection);
    wrapper.appendChild(section);
  }

  wrapper.appendChild(input);

  const rightSection = props.rightSection;
  if (rightSection) {
    const section = document.createElement('span');
    section.className = 'mkt-text-input__section mkt-text-input__section--right';
    section.appendChild(rightSection);
    wrapper.appendChild(section);
  }

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
