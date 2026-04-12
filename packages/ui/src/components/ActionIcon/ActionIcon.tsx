import { mergeClasses } from '../../utils/class-merge';
import { Loader } from '../Loader';
import type { ActionIconProps } from './ActionIcon.types';
import './ActionIcon.css';

export function ActionIcon(props: ActionIconProps = {}): HTMLButtonElement {
  const {
    variant = 'subtle',
    size = 'md',
    color = 'primary',
    disabled,
    loading,
    onClick,
    children,
    class: className,
    ref,
  } = props;

  const ariaLabel = props['aria-label'];

  const el = document.createElement('button');

  el.className = mergeClasses('mkt-action-icon', className);
  el.type = 'button';

  el.dataset.variant = variant;
  el.dataset.size = size;
  el.dataset.color = color;

  if (ariaLabel) el.setAttribute('aria-label', ariaLabel);

  if (disabled) el.disabled = true;
  if (loading) {
    el.dataset.loading = '';
    el.setAttribute('aria-busy', 'true');
    el.disabled = true;
  }

  if (onClick) el.addEventListener('click', onClick);

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  // Icon child
  if (children) {
    el.appendChild(children);
  }

  // Loader overlay
  if (loading) {
    const loaderWrap = document.createElement('span');
    loaderWrap.className = 'mkt-action-icon__loader';
    loaderWrap.appendChild(
      Loader({ size, color: variant === 'filled' ? undefined : color }),
    );
    el.appendChild(loaderWrap);
  }

  return el;
}
