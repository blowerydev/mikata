import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import type { SwitchProps } from './Switch.types';
import './Switch.css';

export function Switch(userProps: SwitchProps = {}): HTMLLabelElement {
  const props = _mergeProps(
    useComponentDefaults<SwitchProps>('Switch') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as SwitchProps;

  const id = uniqueId('switch');

  const root = document.createElement('label');
  renderEffect(() => {
    root.className = mergeClasses(
      'mkt-switch',
      props.disabled && 'mkt-switch--disabled',
      props.class,
      props.classNames?.root,
    );
  });
  renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.setAttribute('role', 'switch');
  renderEffect(() => {
    input.className = mergeClasses('mkt-switch__input', props.classNames?.input);
  });
  if (props.checked != null) input.checked = props.checked;
  else if (props.defaultChecked != null) input.checked = props.defaultChecked;
  renderEffect(() => {
    const c = props.checked;
    if (c != null && input.checked !== c) input.checked = c;
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

  const track = document.createElement('div');
  renderEffect(() => {
    track.className = mergeClasses('mkt-switch__track', props.classNames?.track);
  });
  track.dataset.size = props.size ?? 'md';
  track.setAttribute('aria-hidden', 'true');

  const thumb = document.createElement('div');
  renderEffect(() => {
    thumb.className = mergeClasses('mkt-switch__thumb', props.classNames?.thumb);
  });
  thumb.dataset.size = props.size ?? 'md';
  track.appendChild(thumb);

  root.appendChild(track);

  const textCol = document.createElement('div');

  const labelSpan = document.createElement('span');
  renderEffect(() => {
    labelSpan.className = mergeClasses('mkt-switch__label', props.classNames?.label);
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
  descEl.className = 'mkt-switch__description';
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
  errorEl.className = 'mkt-switch__error';
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
