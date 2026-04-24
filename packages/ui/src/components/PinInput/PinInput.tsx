import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { useDirection } from '../../theme';
import type { PinInputProps } from './PinInput.types';
import './PinInput.css';

export function PinInput(userProps: PinInputProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<PinInputProps>('PinInput') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as PinInputProps;

  const direction = useDirection();

  const length = props.length ?? 4;
  const type = props.type ?? 'number';
  const mask = !!props.mask;
  const initial = (props.value ?? props.defaultValue ?? '').split('');
  const autoFocus = props.autoFocus;

  const inputs: HTMLInputElement[] = [];
  const pattern = type === 'number' ? /^[0-9]$/ : /^[a-zA-Z0-9]$/;

  const emit = () => {
    const v = inputs.map((i) => i.value).join('');
    props.onChange?.(v);
    if (v.length === length) props.onComplete?.(v);
  };

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-pin-input', props.class, props.classNames?.root);
    });
    renderEffect(() => { root.dataset.size = props.size ?? 'md'; });
    renderEffect(() => {
      if (props.error) root.dataset.error = '';
      else delete root.dataset.error;
    });

    for (let i = 0; i < length; i++) {
      adoptElement<HTMLInputElement>('input', (input) => {
        input.setAttribute('type', mask ? 'password' : 'text');
        input.inputMode = type === 'number' ? 'numeric' : 'text';
        input.maxLength = 1;
        input.autocomplete = i === 0 ? 'one-time-code' : 'off';
        renderEffect(() => {
          input.className = mergeClasses('mkt-pin-input__input', props.classNames?.input);
        });
        renderEffect(() => { input.dataset.size = props.size ?? 'md'; });
        renderEffect(() => {
          if (props.error) input.setAttribute('aria-invalid', 'true');
          else input.removeAttribute('aria-invalid');
        });
        renderEffect(() => { input.disabled = !!props.disabled; });
        renderEffect(() => {
          const p = props.placeholder ?? '○';
          input.setAttribute('placeholder', p);
        });
        if (initial[i]) {
          input.setAttribute('value', initial[i]);
          input.value = initial[i];
        }

        input.addEventListener('input', (e) => {
          const target = e.target as HTMLInputElement;
          const ch = target.value;
          if (ch && !pattern.test(ch)) {
            target.value = '';
            return;
          }
          if (ch && i < length - 1) inputs[i + 1].focus();
          emit();
        });

        input.addEventListener('keydown', (e) => {
          const isRtl = direction() === 'rtl';
          const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
          const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
          if (e.key === 'Backspace' && !input.value && i > 0) {
            inputs[i - 1].focus();
          } else if (e.key === prevKey && i > 0) {
            inputs[i - 1].focus();
          } else if (e.key === nextKey && i < length - 1) {
            inputs[i + 1].focus();
          }
        });

        input.addEventListener('paste', (e) => {
          e.preventDefault();
          const data = (e.clipboardData?.getData('text') ?? '').replace(/\s/g, '');
          const cleaned = [...data].filter((c) => pattern.test(c));
          for (let j = 0; j < cleaned.length && i + j < length; j++) {
            inputs[i + j].value = cleaned[j];
          }
          const lastIdx = Math.min(i + cleaned.length, length - 1);
          inputs[lastIdx].focus();
          emit();
        });

        inputs[i] = input;
      });
    }

    if (autoFocus) requestAnimationFrame(() => inputs[0]?.focus());

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
