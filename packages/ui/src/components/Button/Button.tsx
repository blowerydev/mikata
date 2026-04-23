import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { Loader } from '../Loader';
import type { ButtonProps } from './Button.types';
import './Button.css';

// Pilot component for the lazy-props + hydration-aware pattern:
//   - Never destructure `props`; every read goes through `props.foo` so
//     getters (JSX compilation, i18n, signal-backed values) stay live.
//   - Merge defaults with `_mergeProps` — it preserves getter descriptors.
//   - DOM writes that mirror a prop wrap in `renderEffect` so they re-run
//     when the prop's underlying signal changes.
//   - `adoptElement` pulls the server-rendered element out of the
//     adoption cursor during hydration and creates fresh otherwise.
//     Its `setup` callback scopes the cursor into the new element so
//     nested `adoptElement` calls adopt children from the right subtree
//     and auto-attach. No `appendChild` calls are needed - the helper
//     handles attachment for both paths.
export function Button(userProps: ButtonProps = {}): HTMLButtonElement {
  const props = _mergeProps(
    useComponentDefaults<ButtonProps>('Button') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as ButtonProps;

  return adoptElement<HTMLButtonElement>('button', (el) => {
    renderEffect(() => {
      el.className = mergeClasses(
        'mkt-button',
        props.fullWidth && 'mkt-button--full-width',
        props.class,
        props.classNames?.root,
      );
    });

    renderEffect(() => { el.dataset.variant = props.variant ?? 'filled'; });
    renderEffect(() => { el.dataset.size = props.size ?? 'md'; });
    renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });
    renderEffect(() => { el.setAttribute('type', props.type ?? 'button'); });

    renderEffect(() => {
      const loading = !!props.loading;
      el.disabled = !!props.disabled || loading;
      if (loading) {
        el.dataset.loading = '';
        el.setAttribute('aria-busy', 'true');
      } else {
        delete el.dataset.loading;
        el.removeAttribute('aria-busy');
      }
    });

    if (props.onClick) el.addEventListener('click', props.onClick as EventListener);

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLButtonElement | null }).current = el;
    }

    // Left icon slot: wrapper is created once; the icon node itself
    // may be swapped reactively if the user supplies a getter-backed prop.
    adoptElement<HTMLSpanElement>('span', (leftWrap) => {
      renderEffect(() => {
        leftWrap.className = mergeClasses('mkt-button__icon', props.classNames?.icon);
      });
      renderEffect(() => {
        leftWrap.replaceChildren();
        const icon = props.leftIcon;
        if (icon) leftWrap.appendChild(icon);
      });
      renderEffect(() => { leftWrap.hidden = !props.leftIcon; });
    });

    // Label
    adoptElement<HTMLSpanElement>('span', (labelEl) => {
      renderEffect(() => {
        labelEl.className = mergeClasses('mkt-button__label', props.classNames?.label);
      });
      renderEffect(() => {
        const children = props.children;
        labelEl.replaceChildren();
        if (children instanceof Node) {
          labelEl.appendChild(children);
        } else if (children != null) {
          labelEl.textContent = String(children);
        }
      });
    });

    // Right icon slot
    adoptElement<HTMLSpanElement>('span', (rightWrap) => {
      renderEffect(() => {
        rightWrap.className = mergeClasses('mkt-button__icon', props.classNames?.icon);
      });
      renderEffect(() => {
        rightWrap.replaceChildren();
        const icon = props.rightIcon;
        if (icon) rightWrap.appendChild(icon);
      });
      renderEffect(() => { rightWrap.hidden = !props.rightIcon; });
    });

    // Loader slot: always in the tree, shown when loading.
    adoptElement<HTMLSpanElement>('span', (loaderWrap) => {
      renderEffect(() => {
        loaderWrap.className = mergeClasses('mkt-button__loader', props.classNames?.loader);
      });
      renderEffect(() => {
        loaderWrap.replaceChildren();
        if (props.loading) {
          loaderWrap.appendChild(
            Loader({
              size: props.size ?? 'md',
              color: (props.variant ?? 'filled') === 'filled' ? undefined : props.color,
            }),
          );
        }
      });
      renderEffect(() => { loaderWrap.hidden = !props.loading; });
    });
  });
}
