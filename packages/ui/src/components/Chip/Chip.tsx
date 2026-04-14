import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { createIcon, Check } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import type { ChipProps } from './Chip.types';
import './Chip.css';

export function Chip(userProps: ChipProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<ChipProps>('Chip') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as ChipProps;

  const id = uniqueId('chip');

  const root = document.createElement('label');
  renderEffect(() => {
    root.className = mergeClasses('mkt-chip', props.class, props.classNames?.root);
  });
  root.htmlFor = id;
  renderEffect(() => { root.dataset.size = props.size ?? 'md'; });
  renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });
  renderEffect(() => { root.dataset.variant = props.variant ?? 'outline'; });
  renderEffect(() => { root.dataset.radius = props.radius ?? 'full'; });
  renderEffect(() => {
    if (props.disabled) root.dataset.disabled = '';
    else delete root.dataset.disabled;
  });

  const input = document.createElement('input');
  input.type = props.type ?? 'checkbox';
  input.id = id;
  renderEffect(() => {
    input.className = mergeClasses('mkt-chip__input', props.classNames?.input);
  });
  renderEffect(() => {
    const name = props.name;
    if (name) input.name = name;
    else input.removeAttribute('name');
  });
  renderEffect(() => {
    const v = props.value;
    if (v != null) input.value = v;
    else input.removeAttribute('value');
  });
  renderEffect(() => { input.disabled = !!props.disabled; });

  // Initial checked: prefer controlled `checked`, fall back to `defaultChecked`.
  if (props.checked != null) input.checked = props.checked;
  else if (props.defaultChecked) input.checked = true;

  input.addEventListener('change', () => {
    props.onChange?.(input.checked, props.value);
  });

  // Check icon slot — static.
  const iconWrap = document.createElement('span');
  renderEffect(() => {
    iconWrap.className = mergeClasses('mkt-chip__icon', props.classNames?.iconWrap);
  });
  iconWrap.appendChild(createIcon(Check, { size: 10, strokeWidth: 1.75 }));

  const label = document.createElement('span');
  renderEffect(() => {
    label.className = mergeClasses('mkt-chip__label', props.classNames?.label);
  });
  renderEffect(() => {
    const c = props.children;
    if (c == null) label.textContent = '';
    else if (typeof c === 'string') label.textContent = c;
    else label.replaceChildren(c);
  });

  root.appendChild(input);
  root.appendChild(iconWrap);
  root.appendChild(label);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
