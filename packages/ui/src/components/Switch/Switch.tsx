import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
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

  return adoptElement<HTMLLabelElement>('label', (root) => {
    renderEffect(() => {
      root.className = mergeClasses(
        'mkt-switch',
        props.disabled && 'mkt-switch--disabled',
        props.class,
        props.classNames?.root,
      );
    });
    renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });

    adoptElement<HTMLInputElement>('input', (input) => {
      input.setAttribute('type', 'checkbox');
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
    });

    adoptElement<HTMLDivElement>('div', (track) => {
      renderEffect(() => {
        track.className = mergeClasses('mkt-switch__track', props.classNames?.track);
      });
      track.dataset.size = props.size ?? 'md';
      track.setAttribute('aria-hidden', 'true');

      adoptElement<HTMLDivElement>('div', (thumb) => {
        renderEffect(() => {
          thumb.className = mergeClasses('mkt-switch__thumb', props.classNames?.thumb);
        });
        thumb.dataset.size = props.size ?? 'md';
      });
    });

    // Text column with stable child set; `.hidden` toggles visibility
    // instead of reparenting, so SSR and hydrate see the same shape.
    adoptElement<HTMLDivElement>('div', (textCol) => {
      textCol.className = 'mkt-switch__text';

      adoptElement<HTMLSpanElement>('span', (labelSpan) => {
        renderEffect(() => {
          labelSpan.className = mergeClasses('mkt-switch__label', props.classNames?.label);
        });
        renderEffect(() => {
          const l = props.label;
          labelSpan.replaceChildren();
          if (l instanceof Node) labelSpan.appendChild(l);
          else if (l != null) labelSpan.textContent = String(l);
          labelSpan.hidden = !l;
        });
      });

      adoptElement<HTMLParagraphElement>('p', (descEl) => {
        descEl.className = 'mkt-switch__description';
        renderEffect(() => {
          const d = props.description;
          descEl.textContent = d == null ? '' : d;
          descEl.hidden = !d;
        });
      });

      adoptElement<HTMLParagraphElement>('p', (errorEl) => {
        errorEl.className = 'mkt-switch__error';
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
