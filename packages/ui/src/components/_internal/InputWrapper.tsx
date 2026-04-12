import { effect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { InputWrapperProps } from './InputWrapper.types';
import './InputWrapper.css';

export function InputWrapper(props: InputWrapperProps): HTMLDivElement {
  const {
    id,
    label,
    description,
    error,
    required,
    class: className,
    classNames,
    children,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-input-wrapper', className, classNames?.root);

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = mergeClasses('mkt-input-wrapper__label', classNames?.label);
    labelEl.htmlFor = id;
    if (label instanceof Node) { labelEl.appendChild(label); } else { labelEl.textContent = label; }

    if (required) {
      const reqSpan = document.createElement('span');
      reqSpan.className = mergeClasses('mkt-input-wrapper__required', classNames?.required);
      reqSpan.textContent = '*';
      reqSpan.setAttribute('aria-hidden', 'true');
      labelEl.appendChild(reqSpan);
    }

    root.appendChild(labelEl);
  }

  if (description) {
    const descEl = document.createElement('p');
    descEl.className = mergeClasses('mkt-input-wrapper__description', classNames?.description);
    descEl.id = `${id}-description`;
    if (description instanceof Node) { descEl.appendChild(description); } else { descEl.textContent = description; }
    root.appendChild(descEl);
  }

  root.appendChild(children);

  if (typeof error === 'function') {
    const errorEl = document.createElement('p');
    errorEl.className = mergeClasses('mkt-input-wrapper__error', classNames?.error);
    errorEl.id = `${id}-error`;
    errorEl.setAttribute('role', 'alert');
    root.appendChild(errorEl);
    effect(() => {
      const e = error();
      errorEl.replaceChildren();
      if (e == null) {
        errorEl.hidden = true;
      } else {
        errorEl.hidden = false;
        if (e instanceof Node) errorEl.appendChild(e);
        else errorEl.textContent = String(e);
      }
    });
  } else if (error) {
    const errorEl = document.createElement('p');
    errorEl.className = mergeClasses('mkt-input-wrapper__error', classNames?.error);
    errorEl.id = `${id}-error`;
    errorEl.setAttribute('role', 'alert');
    if (error instanceof Node) { errorEl.appendChild(error); } else { errorEl.textContent = error; }
    root.appendChild(errorEl);
  }

  return root;
}
