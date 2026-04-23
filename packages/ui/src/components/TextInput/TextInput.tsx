import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { TextInputProps } from './TextInput.types';
import './TextInput.css';

export function TextInput(userProps: TextInputProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<TextInputProps>('TextInput') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as TextInputProps;

  const id = uniqueId('text-input');

  // left/right sections are fixed at mount — swapping them between
  // renders isn't a supported prop shape, and locking it up front lets
  // us produce a stable subtree for hydration to adopt.
  const leftSection = props.leftSection;
  const rightSection = props.rightSection;

  // Factory: InputWrapper runs this inside its own setup callback so
  // nested `adoptElement` calls adopt from the right cursor position
  // (after the label/description slots InputWrapper emits first).
  const buildChildren = () => adoptElement<HTMLDivElement>('div', (w) => {
    renderEffect(() => {
      w.className = mergeClasses(
        'mkt-text-input',
        leftSection && 'mkt-text-input--has-left',
        rightSection && 'mkt-text-input--has-right',
      );
    });

    if (leftSection) {
      adoptElement<HTMLSpanElement>('span', (section) => {
        section.className = 'mkt-text-input__section mkt-text-input__section--left';
        // Only append on fresh render - on hydration the icon is
        // already sitting inside the adopted section.
        if (!section.firstChild) section.appendChild(leftSection);
      });
    }

    adoptElement<HTMLInputElement>('input', (input) => {
      // setAttribute so the type attribute lands in SSR HTML. The shim's
      // property setter doesn't reflect to the attribute bag.
      input.setAttribute('type', 'text');
      input.id = id;
      renderEffect(() => {
        input.className = mergeClasses('mkt-text-input__input', props.classNames?.input);
      });
      renderEffect(() => { input.dataset.size = props.size ?? 'md'; });

      // Initial value: use setAttribute so SSR HTML includes the
      // `value` attribute (property-only sets don't survive the shim).
      const initialValue = props.value ?? props.defaultValue;
      if (initialValue != null) {
        input.setAttribute('value', initialValue);
        input.value = initialValue;
      }

      renderEffect(() => {
        const v = props.value;
        if (v != null && input.value !== v) input.value = v;
      });

      renderEffect(() => {
        const p = props.placeholder;
        if (p) input.setAttribute('placeholder', p);
        else input.removeAttribute('placeholder');
      });
      renderEffect(() => { input.disabled = !!props.disabled; });
      renderEffect(() => {
        if (props.required) input.setAttribute('aria-required', 'true');
        else input.removeAttribute('aria-required');
      });

      renderEffect(() => {
        const parts: string[] = [];
        if (props.description) parts.push(`${id}-description`);
        if (hasError(props.error)) parts.push(`${id}-error`);
        if (parts.length) input.setAttribute('aria-describedby', parts.join(' '));
        else input.removeAttribute('aria-describedby');
      });
      renderEffect(() => {
        if (hasError(props.error)) {
          input.setAttribute('aria-errormessage', `${id}-error`);
          input.setAttribute('aria-invalid', 'true');
        } else {
          input.removeAttribute('aria-errormessage');
          input.removeAttribute('aria-invalid');
        }
      });

      const onInput = props.onInput;
      if (onInput) input.addEventListener('input', onInput as EventListener);
      const onChange = props.onChange;
      if (onChange) input.addEventListener('change', onChange as EventListener);
      const onBlur = props.onBlur;
      if (onBlur) input.addEventListener('blur', onBlur as EventListener);

      const ref = props.ref;
      if (ref) {
        if (typeof ref === 'function') ref(input);
        else (ref as { current: HTMLInputElement | null }).current = input;
      }
    });

    if (rightSection) {
      adoptElement<HTMLSpanElement>('span', (section) => {
        section.className = 'mkt-text-input__section mkt-text-input__section--right';
        if (!section.firstChild) section.appendChild(rightSection);
      });
    }
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
