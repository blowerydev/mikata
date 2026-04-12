import { mergeClasses } from '../../utils/class-merge';
import type { UnstyledButtonProps } from './UnstyledButton.types';
import './UnstyledButton.css';

export function UnstyledButton(props: UnstyledButtonProps = {}): HTMLElement {
  const { type = 'button', disabled, onClick, children, as = 'button', href, class: className, ref } = props;

  const el = document.createElement(as);
  el.className = mergeClasses('mkt-unstyled-button', className);

  if (as === 'button') {
    (el as HTMLButtonElement).type = type;
    if (disabled) (el as HTMLButtonElement).disabled = true;
  } else {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', disabled ? '-1' : '0');
    if (disabled) el.setAttribute('aria-disabled', 'true');
    if (as === 'a' && href) (el as HTMLAnchorElement).href = href;
  }

  if (children != null) {
    if (typeof children === 'string') el.textContent = children;
    else el.appendChild(children);
  }

  if (onClick) {
    el.addEventListener('click', (e) => {
      if (disabled) return;
      onClick(e as MouseEvent);
    });
    if (as !== 'button') {
      el.addEventListener('keydown', (e) => {
        if (disabled) return;
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault();
          onClick(e as any);
        }
      });
    }
  }

  if (ref) {
    if (typeof ref === 'function') ref(el as any);
    else (ref as any).current = el;
  }
  return el;
}
