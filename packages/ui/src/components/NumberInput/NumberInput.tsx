import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { NumberInputProps } from './NumberInput.types';
import './NumberInput.css';

export function NumberInput(userProps: NumberInputProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<NumberInputProps>('NumberInput') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as NumberInputProps;

  const id = uniqueId('number-input');

  const input = document.createElement('input');
  input.type = 'number';
  input.id = id;
  renderEffect(() => {
    input.className = mergeClasses('mkt-number-input__input', props.classNames?.input);
  });
  renderEffect(() => { input.dataset.size = props.size ?? 'md'; });

  if (props.value != null) input.value = String(props.value);
  else if (props.defaultValue != null) input.value = String(props.defaultValue);
  renderEffect(() => {
    const v = props.value;
    if (v != null && input.value !== String(v)) input.value = String(v);
  });

  renderEffect(() => {
    const p = props.placeholder;
    if (p) input.placeholder = p;
    else input.removeAttribute('placeholder');
  });
  renderEffect(() => { input.disabled = !!props.disabled; });
  renderEffect(() => {
    const m = props.min;
    if (m != null) input.min = String(m);
    else input.removeAttribute('min');
  });
  renderEffect(() => {
    const m = props.max;
    if (m != null) input.max = String(m);
    else input.removeAttribute('max');
  });
  renderEffect(() => { input.step = String(props.step ?? 1); });
  renderEffect(() => {
    if (props.required) input.setAttribute('aria-required', 'true');
    else input.removeAttribute('aria-required');
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
  renderEffect(() => {
    const parts: string[] = [];
    if (props.description) parts.push(`${id}-description`);
    if (hasError(props.error)) parts.push(`${id}-error`);
    if (parts.length) input.setAttribute('aria-describedby', parts.join(' '));
    else input.removeAttribute('aria-describedby');
  });

  const clampAndNotify = (val: number) => {
    const mn = props.min;
    const mx = props.max;
    if (mn != null && val < mn) val = mn;
    if (mx != null && val > mx) val = mx;
    input.value = String(val);
    props.onValueChange?.(val);
  };

  const onInput = props.onInput;
  if (onInput) input.addEventListener('input', onInput as EventListener);
  const onChange = props.onChange;
  if (onChange) input.addEventListener('change', onChange as EventListener);

  input.addEventListener('change', () => {
    const num = parseFloat(input.value);
    if (!isNaN(num)) clampAndNotify(num);
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(input as unknown as HTMLElement);
    else (ref as { current: HTMLInputElement | null }).current = input;
  }

  const controls = document.createElement('div');
  renderEffect(() => {
    controls.className = mergeClasses('mkt-number-input__controls', props.classNames?.controls);
  });

  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.tabIndex = -1;
  upBtn.setAttribute('aria-label', 'Increment');
  upBtn.innerHTML = '&#9650;';
  renderEffect(() => {
    upBtn.className = mergeClasses('mkt-number-input__control', props.classNames?.controlUp);
  });
  renderEffect(() => { upBtn.disabled = !!props.disabled; });

  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.tabIndex = -1;
  downBtn.setAttribute('aria-label', 'Decrement');
  downBtn.innerHTML = '&#9660;';
  renderEffect(() => {
    downBtn.className = mergeClasses('mkt-number-input__control', props.classNames?.controlDown);
  });
  renderEffect(() => { downBtn.disabled = !!props.disabled; });

  upBtn.addEventListener('click', () => {
    const current = parseFloat(input.value) || 0;
    clampAndNotify(current + (props.step ?? 1));
  });
  downBtn.addEventListener('click', () => {
    const current = parseFloat(input.value) || 0;
    clampAndNotify(current - (props.step ?? 1));
  });

  controls.appendChild(upBtn);
  controls.appendChild(downBtn);

  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-number-input';
  wrapper.appendChild(input);
  wrapper.appendChild(controls);

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
