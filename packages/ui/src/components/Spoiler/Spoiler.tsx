import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement, onMount, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { SpoilerProps } from './Spoiler.types';
import './Spoiler.css';

export function Spoiler(userProps: SpoilerProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as SpoilerProps;

  const maxHeight = props.maxHeight ?? 100;
  const showLabel = props.showLabel ?? 'Show more';
  const hideLabel = props.hideLabel ?? 'Hide';
  const children = props.children;

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-spoiler', props.class, props.classNames?.root);
    });

    let contentEl: HTMLDivElement | null = null;
    adoptElement<HTMLDivElement>('div', (content) => {
      contentEl = content;
      renderEffect(() => {
        content.className = mergeClasses('mkt-spoiler__content', props.classNames?.content);
      });
      content.style.maxHeight = `${maxHeight}px`;
      if (children && children.parentNode !== content) content.appendChild(children);
    });

    // The show/hide control is a client-only affordance - SSR can't
    // measure scrollHeight so we don't emit it server-side. onMount
    // runs post-hydration, at which point we measure and append.
    const control = document.createElement('button');
    control.setAttribute('type', 'button');
    control.className = mergeClasses('mkt-spoiler__control', props.classNames?.control);
    control.textContent = showLabel;
    control.setAttribute('aria-expanded', 'false');

    let expanded = false;
    control.addEventListener('click', () => {
      if (!contentEl) return;
      expanded = !expanded;
      if (expanded) {
        contentEl.style.maxHeight = `${contentEl.scrollHeight}px`;
        control.textContent = hideLabel;
        control.setAttribute('aria-expanded', 'true');
      } else {
        contentEl.style.maxHeight = `${maxHeight}px`;
        control.textContent = showLabel;
        control.setAttribute('aria-expanded', 'false');
      }
    });

    onMount(() => {
      if (!contentEl) return;
      if (contentEl.scrollHeight > maxHeight + 1) root.appendChild(control);
      const ro = new ResizeObserver(() => {
        if (!contentEl) return;
        const overflowing = contentEl.scrollHeight > maxHeight + 1;
        if (overflowing && !control.isConnected) root.appendChild(control);
        else if (!overflowing && control.isConnected) control.remove();
      });
      ro.observe(contentEl);
      onCleanup(() => ro.disconnect());
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
