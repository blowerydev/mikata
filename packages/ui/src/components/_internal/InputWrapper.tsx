import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { InputWrapperProps } from './InputWrapper.types';
import './InputWrapper.css';

// Lazy-props component: reads `props.label`, `props.error`, etc. inside effects
// so getter-backed props (JSX compilation, signals, i18n) drive DOM updates
// directly. No `typeof x === 'function'` branch — the effect is the subscription.
export function InputWrapper(props: InputWrapperProps): HTMLDivElement {
  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses(
      'mkt-input-wrapper',
      props.class,
      props.classNames?.root,
    );
  });

  // Children go in first so we have a stable anchor for later insertBefore.
  root.appendChild(props.children);

  // Label slot — created once; inserted/removed as the prop toggles.
  const labelEl = document.createElement('label');
  labelEl.htmlFor = props.id;
  const requiredSpan = document.createElement('span');
  requiredSpan.textContent = '*';
  requiredSpan.setAttribute('aria-hidden', 'true');

  renderEffect(() => {
    labelEl.className = mergeClasses('mkt-input-wrapper__label', props.classNames?.label);
  });
  renderEffect(() => {
    requiredSpan.className = mergeClasses(
      'mkt-input-wrapper__required',
      props.classNames?.required,
    );
  });
  renderEffect(() => {
    labelEl.replaceChildren();
    const label = props.label;
    if (label instanceof Node) labelEl.appendChild(label);
    else if (label != null) labelEl.textContent = String(label);
    if (props.required) labelEl.appendChild(requiredSpan);
  });
  renderEffect(() => {
    if (props.label) {
      if (!labelEl.isConnected) root.insertBefore(labelEl, root.firstChild);
    } else if (labelEl.isConnected) {
      labelEl.remove();
    }
  });

  // Description slot — inserted right before the input children.
  const descEl = document.createElement('p');
  descEl.id = `${props.id}-description`;
  renderEffect(() => {
    descEl.className = mergeClasses(
      'mkt-input-wrapper__description',
      props.classNames?.description,
    );
  });
  renderEffect(() => {
    descEl.replaceChildren();
    const desc = props.description;
    if (desc instanceof Node) descEl.appendChild(desc);
    else if (desc != null) descEl.textContent = String(desc);
  });
  renderEffect(() => {
    if (props.description) {
      if (!descEl.isConnected) root.insertBefore(descEl, props.children);
    } else if (descEl.isConnected) {
      descEl.remove();
    }
  });

  // Error slot — created once; text swapped reactively; appended last.
  const errorEl = document.createElement('p');
  errorEl.id = `${props.id}-error`;
  errorEl.setAttribute('role', 'alert');
  renderEffect(() => {
    errorEl.className = mergeClasses(
      'mkt-input-wrapper__error',
      props.classNames?.error,
    );
  });
  renderEffect(() => {
    // Function form is a transitional shim for callers that haven't migrated
    // to getter-backed props yet. Once all `@mikata/ui` inputs read
    // `props.error` lazily, the narrowed union drops the callable form and
    // this branch goes away.
    const raw = props.error;
    const err = typeof raw === 'function' ? raw() : raw;
    errorEl.replaceChildren();
    if (err == null || err === false || err === '') {
      if (errorEl.isConnected) errorEl.remove();
      return;
    }
    if (err instanceof Node) errorEl.appendChild(err);
    else errorEl.textContent = String(err);
    if (!errorEl.isConnected) root.appendChild(errorEl);
  });

  return root;
}
