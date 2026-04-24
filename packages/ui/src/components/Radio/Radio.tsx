import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
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

  return adoptElement<HTMLLabelElement>('label', (root) => {
    renderEffect(() => {
      root.className = mergeClasses(
        'mkt-radio',
        props.disabled && 'mkt-radio--disabled',
        props.class,
        props.classNames?.root,
      );
    });
    renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });

    adoptElement<HTMLInputElement>('input', (input) => {
      input.setAttribute('type', 'radio');
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
        if (n) input.setAttribute('name', n);
        else input.removeAttribute('name');
      });
      renderEffect(() => {
        const v = props.value;
        if (v != null) input.setAttribute('value', v);
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
    });

    adoptElement<HTMLDivElement>('div', (icon) => {
      renderEffect(() => {
        icon.className = mergeClasses('mkt-radio__icon', props.classNames?.icon);
      });
      icon.dataset.size = props.size ?? 'md';
      icon.setAttribute('aria-hidden', 'true');
    });

    // Text column with stable child set - hidden flags drive visibility
    // so SSR/hydrate structures match regardless of prop combinations.
    adoptElement<HTMLDivElement>('div', (textCol) => {
      textCol.className = 'mkt-radio__text';

      adoptElement<HTMLSpanElement>('span', (labelSpan) => {
        renderEffect(() => {
          labelSpan.className = mergeClasses('mkt-radio__label', props.classNames?.label);
        });
        renderEffect(() => {
          const l = props.label;
          labelSpan.textContent = l == null ? '' : l;
          labelSpan.hidden = !l;
        });
      });

      adoptElement<HTMLParagraphElement>('p', (descEl) => {
        descEl.className = 'mkt-radio__description';
        renderEffect(() => {
          const d = props.description;
          descEl.textContent = d == null ? '' : d;
          descEl.hidden = !d;
        });
      });

      adoptElement<HTMLParagraphElement>('p', (errorEl) => {
        errorEl.className = 'mkt-radio__error';
        errorEl.setAttribute('role', 'alert');
        renderEffect(() => {
          const e = props.error;
          errorEl.textContent = e == null || e === '' ? '' : e;
          errorEl.hidden = !e;
        });
      });
    });
  });
}
