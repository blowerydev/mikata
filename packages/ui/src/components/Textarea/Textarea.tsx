import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { TextareaProps } from './Textarea.types';
import './Textarea.css';

export function Textarea(userProps: TextareaProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<TextareaProps>('Textarea') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as TextareaProps;

  const id = uniqueId('textarea');
  const autosize = !!props.autosize;

  const buildChildren = () => adoptElement<HTMLTextAreaElement>('textarea', (textarea) => {
    textarea.id = id;
    renderEffect(() => {
      textarea.className = mergeClasses(
        'mkt-textarea__input',
        autosize && 'mkt-textarea__input--autosize',
        props.classNames?.input,
      );
    });
    renderEffect(() => { textarea.dataset.size = props.size ?? 'md'; });
    renderEffect(() => { textarea.rows = props.rows ?? 4; });

    const initial = props.value ?? props.defaultValue;
    if (initial != null) {
      // textarea's value lives in textContent for SSR purposes.
      textarea.textContent = initial;
      textarea.value = initial;
    }
    renderEffect(() => {
      const v = props.value;
      if (v != null && textarea.value !== v) textarea.value = v;
    });

    renderEffect(() => {
      const p = props.placeholder;
      if (p) textarea.setAttribute('placeholder', p);
      else textarea.removeAttribute('placeholder');
    });
    renderEffect(() => { textarea.disabled = !!props.disabled; });
    renderEffect(() => {
      if (props.required) textarea.setAttribute('aria-required', 'true');
      else textarea.removeAttribute('aria-required');
    });

    renderEffect(() => {
      const parts: string[] = [];
      if (props.description) parts.push(`${id}-description`);
      if (hasError(props.error)) parts.push(`${id}-error`);
      if (parts.length) textarea.setAttribute('aria-describedby', parts.join(' '));
      else textarea.removeAttribute('aria-describedby');
    });
    renderEffect(() => {
      if (hasError(props.error)) {
        textarea.setAttribute('aria-errormessage', `${id}-error`);
        textarea.setAttribute('aria-invalid', 'true');
      } else {
        textarea.removeAttribute('aria-errormessage');
        textarea.removeAttribute('aria-invalid');
      }
    });

    if (autosize) {
      const adjustHeight = () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      };
      textarea.addEventListener('input', adjustHeight);
      requestAnimationFrame(adjustHeight);
    }

    const onInput = props.onInput;
    if (onInput) textarea.addEventListener('input', onInput as EventListener);
    const onChange = props.onChange;
    if (onChange) textarea.addEventListener('change', onChange as EventListener);
    const onBlur = props.onBlur;
    if (onBlur) textarea.addEventListener('blur', onBlur as EventListener);

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(textarea as unknown as HTMLElement);
      else (ref as { current: HTMLTextAreaElement | null }).current = textarea;
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
