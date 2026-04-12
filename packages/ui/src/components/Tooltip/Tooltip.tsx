import { onCleanup } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { TooltipProps } from './Tooltip.types';
import './Tooltip.css';

export function Tooltip(props: TooltipProps): HTMLSpanElement {
  const {
    label,
    position = 'top',
    delay = 300,
    disabled,
    children,
    class: className,
    ref,
  } = props;

  const tooltipId = uniqueId('tooltip');
  let timer: ReturnType<typeof setTimeout> | null = null;
  let tooltipEl: HTMLDivElement | null = null;

  const wrapper = document.createElement('span');
  wrapper.className = mergeClasses('mkt-tooltip-wrapper', className);
  wrapper.appendChild(children);

  function show(): void {
    if (disabled || tooltipEl) return;

    timer = setTimeout(() => {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'mkt-tooltip';
      tooltipEl.id = tooltipId;
      tooltipEl.setAttribute('role', 'tooltip');
      tooltipEl.setAttribute('data-position', position);
      tooltipEl.textContent = label;

      wrapper.appendChild(tooltipEl);
      children instanceof HTMLElement &&
        children.setAttribute('aria-describedby', tooltipId);
    }, delay);
  }

  function hide(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
      children instanceof HTMLElement &&
        children.removeAttribute('aria-describedby');
    }
  }

  wrapper.addEventListener('mouseenter', show);
  wrapper.addEventListener('mouseleave', hide);
  wrapper.addEventListener('focusin', show);
  wrapper.addEventListener('focusout', hide);

  onCleanup(() => {
    hide();
    wrapper.removeEventListener('mouseenter', show);
    wrapper.removeEventListener('mouseleave', hide);
    wrapper.removeEventListener('focusin', show);
    wrapper.removeEventListener('focusout', hide);
  });

  if (ref) {
    if (typeof ref === 'function') ref(wrapper);
    else (ref as any).current = wrapper;
  }

  return wrapper;
}
