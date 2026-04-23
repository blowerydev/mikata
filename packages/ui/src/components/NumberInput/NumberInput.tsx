import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
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
  // Holds the underlying `<input>` so the up/down buttons can read and
  // write its value. The input is assembled inside the wrapper setup
  // below via `adoptElement`; we capture the reference from there.
  let inputEl: HTMLInputElement | null = null;

  const clampAndNotify = (val: number) => {
    if (!inputEl) return;
    const mn = props.min;
    const mx = props.max;
    if (mn != null && val < mn) val = mn;
    if (mx != null && val > mx) val = mx;
    inputEl.value = String(val);
    props.onValueChange?.(val);
  };

  const buildChildren = () => adoptElement<HTMLDivElement>('div', (w) => {
    w.className = 'mkt-number-input';

    adoptElement<HTMLInputElement>('input', (input) => {
      inputEl = input;
      // setAttribute so the type attribute survives SSR serialisation.
      // Property assignment (`input.type = 'number'`) only sets the JS
      // property; the server shim's SElement doesn't reflect it.
      input.setAttribute('type', 'number');
      input.id = id;
      renderEffect(() => {
        input.className = mergeClasses('mkt-number-input__input', props.classNames?.input);
      });
      renderEffect(() => { input.dataset.size = props.size ?? 'md'; });

      const initial = props.value ?? props.defaultValue;
      if (initial != null) {
        input.setAttribute('value', String(initial));
        input.value = String(initial);
      }
      renderEffect(() => {
        const v = props.value;
        if (v != null && input.value !== String(v)) input.value = String(v);
      });

      renderEffect(() => {
        const p = props.placeholder;
        if (p) input.setAttribute('placeholder', p);
        else input.removeAttribute('placeholder');
      });
      renderEffect(() => { input.disabled = !!props.disabled; });
      renderEffect(() => {
        const m = props.min;
        if (m != null) input.setAttribute('min', String(m));
        else input.removeAttribute('min');
      });
      renderEffect(() => {
        const m = props.max;
        if (m != null) input.setAttribute('max', String(m));
        else input.removeAttribute('max');
      });
      renderEffect(() => { input.setAttribute('step', String(props.step ?? 1)); });
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
    });

    adoptElement<HTMLDivElement>('div', (controls) => {
      renderEffect(() => {
        controls.className = mergeClasses('mkt-number-input__controls', props.classNames?.controls);
      });

      adoptElement<HTMLButtonElement>('button', (upBtn) => {
        upBtn.type = 'button';
        upBtn.tabIndex = -1;
        upBtn.setAttribute('aria-label', 'Increment');
        // Set the arrow glyph once - on hydration it's already there.
        if (!upBtn.textContent) upBtn.innerHTML = '&#9650;';
        renderEffect(() => {
          upBtn.className = mergeClasses('mkt-number-input__control', props.classNames?.controlUp);
        });
        renderEffect(() => { upBtn.disabled = !!props.disabled; });
        upBtn.addEventListener('click', () => {
          const current = parseFloat(inputEl?.value ?? '0') || 0;
          clampAndNotify(current + (props.step ?? 1));
        });
      });

      adoptElement<HTMLButtonElement>('button', (downBtn) => {
        downBtn.type = 'button';
        downBtn.tabIndex = -1;
        downBtn.setAttribute('aria-label', 'Decrement');
        if (!downBtn.textContent) downBtn.innerHTML = '&#9660;';
        renderEffect(() => {
          downBtn.className = mergeClasses('mkt-number-input__control', props.classNames?.controlDown);
        });
        renderEffect(() => { downBtn.disabled = !!props.disabled; });
        downBtn.addEventListener('click', () => {
          const current = parseFloat(inputEl?.value ?? '0') || 0;
          clampAndNotify(current - (props.step ?? 1));
        });
      });
    });
  });

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: buildChildren,
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
