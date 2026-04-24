import { onCleanup, renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { TooltipProps } from './Tooltip.types';
import './Tooltip.css';

export function Tooltip(userProps: TooltipProps): HTMLSpanElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as TooltipProps;

  // `children` is structural. `label`, `position`, `delay`, `disabled`
  // are read each time the tooltip is shown so they stay current.
  const children = props.children;

  const tooltipId = uniqueId('tooltip');
  let timer: ReturnType<typeof setTimeout> | null = null;
  let tooltipEl: HTMLDivElement | null = null;

  return adoptElement<HTMLSpanElement>('span', (wrapper) => {
    renderEffect(() => {
      wrapper.className = mergeClasses('mkt-tooltip-wrapper', props.class);
    });
    if (children.parentNode !== wrapper) wrapper.appendChild(children);

    function show(): void {
      if (props.disabled || tooltipEl) return;

      timer = setTimeout(() => {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'mkt-tooltip';
        tooltipEl.id = tooltipId;
        tooltipEl.setAttribute('role', 'tooltip');
        tooltipEl.dataset.position = props.position ?? 'top';
        tooltipEl.textContent = props.label;

        wrapper.appendChild(tooltipEl);
        if (children instanceof HTMLElement) {
          children.setAttribute('aria-describedby', tooltipId);
        }
      }, props.delay ?? 300);
    }

    function hide(): void {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
        if (children instanceof HTMLElement) {
          children.removeAttribute('aria-describedby');
        }
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

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(wrapper);
      else (ref as { current: HTMLSpanElement | null }).current = wrapper;
    }
  });
}
