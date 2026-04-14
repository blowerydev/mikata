import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { UnstyledButtonProps } from './UnstyledButton.types';
import './UnstyledButton.css';

export function UnstyledButton(userProps: UnstyledButtonProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as UnstyledButtonProps;

  // `as`, `children`, `onClick` are structural — decide tag, content, and
  // listener wiring.
  const as = props.as ?? 'button';
  const children = props.children;
  const onClick = props.onClick;

  const el = document.createElement(as);
  renderEffect(() => {
    el.className = mergeClasses('mkt-unstyled-button', props.class);
  });

  if (as === 'button') {
    renderEffect(() => {
      (el as HTMLButtonElement).type = props.type ?? 'button';
    });
    renderEffect(() => {
      (el as HTMLButtonElement).disabled = !!props.disabled;
    });
  } else {
    el.setAttribute('role', 'button');
    renderEffect(() => {
      const disabled = !!props.disabled;
      el.setAttribute('tabindex', disabled ? '-1' : '0');
      if (disabled) el.setAttribute('aria-disabled', 'true');
      else el.removeAttribute('aria-disabled');
    });
    if (as === 'a') {
      renderEffect(() => {
        const href = props.href;
        if (href) (el as HTMLAnchorElement).href = href;
        else el.removeAttribute('href');
      });
    }
  }

  if (children != null) {
    if (typeof children === 'string') el.textContent = children;
    else el.appendChild(children);
  }

  if (onClick) {
    el.addEventListener('click', (e) => {
      if (props.disabled) return;
      onClick(e as MouseEvent);
    });
    if (as !== 'button') {
      el.addEventListener('keydown', (e) => {
        if (props.disabled) return;
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault();
          onClick(e as any);
        }
      });
    }
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }
  return el;
}
