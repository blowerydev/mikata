import { getCurrentScope, onCleanup, renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { createIcon, Check } from '../../internal/icons';
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

  // Size is part of the SVG path, so read once at setup time - changing
  // it after mount would need a redraw, and callers who want that can
  // remount.
  const size = props.size ?? 'md';
  const svgSize = size === 'xs' || size === 'sm' ? 10 : size === 'lg' ? 16 : size === 'xl' ? 20 : 12;

  return adoptElement<HTMLLabelElement>('label', (root) => {
    renderEffect(() => {
      root.className = mergeClasses(
        'mkt-checkbox',
        props.disabled && 'mkt-checkbox--disabled',
        props.class,
        props.classNames?.root,
      );
    });
    renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });

    adoptElement<HTMLInputElement>('input', (input) => {
      input.setAttribute('type', 'checkbox');
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
        if (hasError(props.error)) {
          input.setAttribute('aria-invalid', 'true');
          input.setAttribute('aria-errormessage', `${id}-error`);
        } else {
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-errormessage');
        }
      });
      // Wire description and error nodes to the input via aria-describedby
      // so screen readers announce them when focus enters the control.
      // Both IDs are listed when both fields are present; absent fields
      // are dropped so the attribute never points at hidden nodes.
      renderEffect(() => {
        const parts: string[] = [];
        if (props.description != null && props.description !== '') {
          parts.push(`${id}-description`);
        }
        if (hasError(props.error)) parts.push(`${id}-error`);
        if (parts.length) input.setAttribute('aria-describedby', parts.join(' '));
        else input.removeAttribute('aria-describedby');
      });
      const onChange = props.onChange;
      if (onChange) {
        input.addEventListener('change', onChange as EventListener);
        if (getCurrentScope()) {
          onCleanup(() => input.removeEventListener('change', onChange as EventListener));
        }
      }
      const onBlur = props.onBlur;
      if (onBlur) {
        input.addEventListener('blur', onBlur as EventListener);
        if (getCurrentScope()) {
          onCleanup(() => input.removeEventListener('blur', onBlur as EventListener));
        }
      }

      const ref = props.ref;
      if (ref) {
        if (typeof ref === 'function') ref(input);
        else (ref as { current: HTMLInputElement | null }).current = input;
      }
    });

    // Custom indicator. The SVG is a one-shot append - it never swaps.
    adoptElement<HTMLDivElement>('div', (icon) => {
      renderEffect(() => {
        icon.className = mergeClasses('mkt-checkbox__icon', props.classNames?.icon);
      });
      icon.dataset.size = size;
      icon.setAttribute('aria-hidden', 'true');
      // Only add the check svg on fresh renders - on hydration the SSR'd
      // svg is already sitting inside the adopted icon div.
      if (!icon.firstChild) {
        icon.appendChild(createIcon(Check, { size: svgSize, strokeWidth: 3 }));
      }
    });

    // Text column: always present. Each child element is always in the
    // tree; reactive effects toggle `.hidden` and swap inner content.
    // Keeping structure stable is what makes hydration adopt cleanly -
    // conditional DOM (sometimes 0 children, sometimes 3) would desync.
    adoptElement<HTMLDivElement>('div', (textCol) => {
      textCol.className = 'mkt-checkbox__text';

      adoptElement<HTMLSpanElement>('span', (labelSpan) => {
        renderEffect(() => {
          labelSpan.className = mergeClasses('mkt-checkbox__label', props.classNames?.label);
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
        descEl.className = 'mkt-checkbox__description';
        descEl.id = `${id}-description`;
        renderEffect(() => {
          const d = props.description;
          descEl.replaceChildren();
          if (d instanceof Node) descEl.appendChild(d);
          else if (d != null) descEl.textContent = String(d);
          descEl.hidden = !d;
        });
      });

      adoptElement<HTMLParagraphElement>('p', (errorEl) => {
        errorEl.className = 'mkt-checkbox__error';
        errorEl.id = `${id}-error`;
        errorEl.setAttribute('role', 'alert');
        renderEffect(() => {
          const raw = props.error;
          const e = typeof raw === 'function' ? (raw as () => unknown)() : raw;
          errorEl.replaceChildren();
          const empty = e == null || e === false || e === '';
          if (!empty) {
            if (e instanceof Node) errorEl.appendChild(e);
            else errorEl.textContent = String(e);
          }
          errorEl.hidden = empty;
        });
      });
    });
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
