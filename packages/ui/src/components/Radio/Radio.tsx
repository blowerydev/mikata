import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import type { RadioProps } from './Radio.types';
import './Radio.css';

export function Radio(userProps: RadioProps = {}): HTMLLabelElement {
  const props = _mergeProps(
    useComponentDefaults<RadioProps>('Radio') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as RadioProps;

  const id = uniqueId('radio');

  const root = document.createElement('label');
  renderEffect(() => {
    root.className = mergeClasses(
      'mkt-radio',
      props.disabled && 'mkt-radio--disabled',
      props.class,
      props.classNames?.root,
    );
  });
  renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });

  const input = document.createElement('input');
  input.type = 'radio';
  input.id = id;
  renderEffect(() => {
    input.className = mergeClasses('mkt-radio__input', props.classNames?.input);
  });
  if (props.checked != null) input.checked = props.checked;
  else if (props.defaultChecked != null) input.checked = props.defaultChecked;
  renderEffect(() => {
    const c = props.checked;
    if (c != null && input.checked !== c) input.checked = c;
  });
  renderEffect(() => {
    const n = props.name;
    if (n) input.name = n;
    else input.removeAttribute('name');
  });
  renderEffect(() => {
    const v = props.value;
    if (v != null) input.value = v;
    else input.removeAttribute('value');
  });
  renderEffect(() => { input.disabled = !!props.disabled; });
  renderEffect(() => {
    if (props.error) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
  const onChange = props.onChange;
  if (onChange) input.addEventListener('change', onChange as EventListener);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(input);
    else (ref as { current: HTMLInputElement | null }).current = input;
  }

  root.appendChild(input);

  const icon = document.createElement('div');
  renderEffect(() => {
    icon.className = mergeClasses('mkt-radio__icon', props.classNames?.icon);
  });
  icon.dataset.size = props.size ?? 'md';
  icon.setAttribute('aria-hidden', 'true');
  root.appendChild(icon);

  const textCol = document.createElement('div');

  const labelSpan = document.createElement('span');
  renderEffect(() => {
    labelSpan.className = mergeClasses('mkt-radio__label', props.classNames?.label);
  });
  renderEffect(() => {
    const l = props.label;
    labelSpan.textContent = l == null ? '' : l;
  });
  renderEffect(() => {
    if (props.label) {
      if (!labelSpan.isConnected) textCol.appendChild(labelSpan);
    } else if (labelSpan.isConnected) {
      labelSpan.remove();
    }
  });

  const descEl = document.createElement('p');
  descEl.className = 'mkt-radio__description';
  renderEffect(() => {
    const d = props.description;
    descEl.textContent = d == null ? '' : d;
  });
  renderEffect(() => {
    if (props.description) {
      if (!descEl.isConnected) textCol.appendChild(descEl);
    } else if (descEl.isConnected) {
      descEl.remove();
    }
  });

  const errorEl = document.createElement('p');
  errorEl.className = 'mkt-radio__error';
  errorEl.setAttribute('role', 'alert');
  renderEffect(() => {
    const e = props.error;
    errorEl.textContent = e == null || e === '' ? '' : e;
  });
  renderEffect(() => {
    if (props.error) {
      if (!errorEl.isConnected) textCol.appendChild(errorEl);
    } else if (errorEl.isConnected) {
      errorEl.remove();
    }
  });

  root.appendChild(textCol);

  return root;
}
