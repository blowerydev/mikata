import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { createIcon, Check } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import type { CheckboxProps } from './Checkbox.types';
import './Checkbox.css';

export function Checkbox(userProps: CheckboxProps = {}): HTMLLabelElement {
  const props = _mergeProps(
    useComponentDefaults<CheckboxProps>('Checkbox') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as CheckboxProps;

  const id = uniqueId('checkbox');

  const root = document.createElement('label');
  renderEffect(() => {
    root.className = mergeClasses(
      'mkt-checkbox',
      props.disabled && 'mkt-checkbox--disabled',
      props.class,
      props.classNames?.root,
    );
  });
  renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  renderEffect(() => {
    input.className = mergeClasses('mkt-checkbox__input', props.classNames?.input);
  });
  if (props.checked != null) input.checked = props.checked;
  else if (props.defaultChecked != null) input.checked = props.defaultChecked;
  renderEffect(() => {
    const c = props.checked;
    if (c != null && input.checked !== c) input.checked = c;
  });
  renderEffect(() => { input.disabled = !!props.disabled; });
  renderEffect(() => {
    if (hasError(props.error)) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
  const onChange = props.onChange;
  if (onChange) input.addEventListener('change', onChange as EventListener);
  const onBlur = props.onBlur;
  if (onBlur) input.addEventListener('blur', onBlur as EventListener);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(input);
    else (ref as { current: HTMLInputElement | null }).current = input;
  }

  root.appendChild(input);

  // Custom indicator — size is part of the SVG so read once at setup.
  const size = props.size ?? 'md';
  const icon = document.createElement('div');
  renderEffect(() => {
    icon.className = mergeClasses('mkt-checkbox__icon', props.classNames?.icon);
  });
  icon.dataset.size = size;
  icon.setAttribute('aria-hidden', 'true');
  const svgSize = size === 'xs' || size === 'sm' ? 10 : size === 'lg' ? 16 : size === 'xl' ? 20 : 12;
  icon.appendChild(createIcon(Check, { size: svgSize, strokeWidth: 3 }));
  root.appendChild(icon);

  // Text column is always present; children inside toggle via effects.
  const textCol = document.createElement('div');

  const labelSpan = document.createElement('span');
  renderEffect(() => {
    labelSpan.className = mergeClasses('mkt-checkbox__label', props.classNames?.label);
  });
  renderEffect(() => {
    const l = props.label;
    labelSpan.replaceChildren();
    if (l instanceof Node) labelSpan.appendChild(l);
    else if (l != null) labelSpan.textContent = String(l);
  });
  renderEffect(() => {
    if (props.label) {
      if (!labelSpan.isConnected) textCol.appendChild(labelSpan);
    } else if (labelSpan.isConnected) {
      labelSpan.remove();
    }
  });

  const descEl = document.createElement('p');
  descEl.className = 'mkt-checkbox__description';
  renderEffect(() => {
    const d = props.description;
    descEl.replaceChildren();
    if (d instanceof Node) descEl.appendChild(d);
    else if (d != null) descEl.textContent = String(d);
  });
  renderEffect(() => {
    if (props.description) {
      if (!descEl.isConnected) textCol.appendChild(descEl);
    } else if (descEl.isConnected) {
      descEl.remove();
    }
  });

  const errorEl = document.createElement('p');
  errorEl.className = 'mkt-checkbox__error';
  errorEl.setAttribute('role', 'alert');
  renderEffect(() => {
    const raw = props.error;
    const e = typeof raw === 'function' ? (raw as () => unknown)() : raw;
    errorEl.replaceChildren();
    if (e == null || e === false || e === '') {
      if (errorEl.isConnected) errorEl.remove();
      return;
    }
    if (e instanceof Node) errorEl.appendChild(e);
    else errorEl.textContent = String(e);
    if (!errorEl.isConnected) textCol.appendChild(errorEl);
  });

  // Text column only shown when at least one child is present. Listen once
  // to any of the three — the individual effects already toggle presence,
  // so the column can stay in the tree; users won't see empty space because
  // its children collapse to nothing.
  root.appendChild(textCol);

  return root;
}

function hasError(err: unknown): boolean {
  if (err == null || err === false || err === '') return false;
  if (typeof err === 'function') {
    const v = (err as () => unknown)();
    return v != null && v !== false && v !== '';
  }
  return true;
}
