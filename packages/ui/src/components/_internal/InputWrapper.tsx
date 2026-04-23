import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { InputWrapperProps } from './InputWrapper.types';
import './InputWrapper.css';

// Lazy-props component: reads `props.label`, `props.error`, etc. inside
// effects so getter-backed props (JSX compilation, signals, i18n) drive
// DOM updates directly.
//
// All four slot elements (label, description, children, error) are
// always in the tree; reactive effects toggle `.hidden` and swap inner
// content. Stable structure is what makes hydration work — a
// conditional attach/detach pattern would change the SSR sibling count
// depending on initial props, desynchronising with the adoption cursor.
//
// Layout order inside the flex column:
//   label → description → children → error
export function InputWrapper(props: InputWrapperProps): HTMLDivElement {
  return adoptElement<HTMLDivElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses(
        'mkt-input-wrapper',
        props.class,
        props.classNames?.root,
      );
    });

    adoptElement<HTMLLabelElement>('label', (labelEl) => {
      labelEl.htmlFor = props.id;
      renderEffect(() => {
        labelEl.className = mergeClasses('mkt-input-wrapper__label', props.classNames?.label);
      });
      // A text-holder span sits inside the label with the inline
      // required-asterisk after it. Two children is stable across
      // renders even as the label text swaps.
      adoptElement<HTMLSpanElement>('span', (labelText) => {
        renderEffect(() => {
          const label = props.label;
          labelText.replaceChildren();
          if (label instanceof Node) labelText.appendChild(label);
          else if (label != null) labelText.textContent = String(label);
        });
      });
      adoptElement<HTMLSpanElement>('span', (requiredSpan) => {
        requiredSpan.textContent = '*';
        requiredSpan.setAttribute('aria-hidden', 'true');
        renderEffect(() => {
          requiredSpan.className = mergeClasses(
            'mkt-input-wrapper__required',
            props.classNames?.required,
          );
          requiredSpan.hidden = !props.required;
        });
      });
      renderEffect(() => {
        labelEl.hidden = !props.label;
      });
    });

    adoptElement<HTMLParagraphElement>('p', (descEl) => {
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
        descEl.hidden = !desc;
      });
    });

    // The user-supplied input(s). When `children` is a factory, run
    // it inside this setup so any nested `adoptElement` calls adopt
    // from the cursor position the label/description slots just
    // advanced past. When it's a pre-built node, append it (orphan
    // moves under `root` on fresh render; on hydration it's already
    // in place and appendChild is a no-op for same-parent).
    const childrenEntry =
      typeof props.children === 'function' ? props.children() : props.children;
    if (childrenEntry.parentNode !== root) {
      root.appendChild(childrenEntry);
    }

    adoptElement<HTMLParagraphElement>('p', (errorEl) => {
      errorEl.id = `${props.id}-error`;
      errorEl.setAttribute('role', 'alert');
      renderEffect(() => {
        errorEl.className = mergeClasses(
          'mkt-input-wrapper__error',
          props.classNames?.error,
        );
      });
      renderEffect(() => {
        const raw = props.error;
        const err = typeof raw === 'function' ? raw() : raw;
        errorEl.replaceChildren();
        const empty = err == null || err === false || err === '';
        if (!empty) {
          if (err instanceof Node) errorEl.appendChild(err);
          else errorEl.textContent = String(err);
        }
        errorEl.hidden = empty;
      });
    });
  });
}
