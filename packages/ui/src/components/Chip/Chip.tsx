import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
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

  return adoptElement<HTMLLabelElement>('label', (root) => {
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

    adoptElement<HTMLInputElement>('input', (input) => {
      input.setAttribute('type', props.type ?? 'checkbox');
      input.id = id;
      renderEffect(() => {
        input.className = mergeClasses('mkt-chip__input', props.classNames?.input);
      });
      renderEffect(() => {
        const name = props.name;
        if (name) input.setAttribute('name', name);
        else input.removeAttribute('name');
      });
      renderEffect(() => {
        const v = props.value;
        if (v != null) input.setAttribute('value', v);
        else input.removeAttribute('value');
      });
      renderEffect(() => { input.disabled = !!props.disabled; });

      if (props.checked != null) input.checked = props.checked;
      else if (props.defaultChecked) input.checked = true;

      input.addEventListener('change', () => {
        props.onChange?.(input.checked, props.value);
      });
    });

    adoptElement<HTMLSpanElement>('span', (iconWrap) => {
      renderEffect(() => {
        iconWrap.className = mergeClasses('mkt-chip__icon', props.classNames?.iconWrap);
      });
      if (!iconWrap.firstChild) {
        iconWrap.appendChild(createIcon(Check, { size: 10, strokeWidth: 1.75 }));
      }
    });

    adoptElement<HTMLSpanElement>('span', (label) => {
      renderEffect(() => {
        label.className = mergeClasses('mkt-chip__label', props.classNames?.label);
      });
      renderEffect(() => {
        const c = props.children;
        if (c == null) label.textContent = '';
        else if (typeof c === 'string') label.textContent = c;
        else label.replaceChildren(c);
      });
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
