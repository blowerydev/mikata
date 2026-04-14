import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, onMount, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { SpoilerProps } from './Spoiler.types';
import './Spoiler.css';

export function Spoiler(userProps: SpoilerProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as SpoilerProps;

  // `maxHeight`, `children`, `showLabel`, `hideLabel` are structural —
  // geometry, content, and button labels captured once.
  const maxHeight = props.maxHeight ?? 100;
  const showLabel = props.showLabel ?? 'Show more';
  const hideLabel = props.hideLabel ?? 'Hide';
  const children = props.children;

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-spoiler', props.class, props.classNames?.root);
  });

  const content = document.createElement('div');
  renderEffect(() => {
    content.className = mergeClasses('mkt-spoiler__content', props.classNames?.content);
  });
  content.style.maxHeight = `${maxHeight}px`;
  content.appendChild(children);
  root.appendChild(content);

  const control = document.createElement('button');
  control.type = 'button';
  renderEffect(() => {
    control.className = mergeClasses('mkt-spoiler__control', props.classNames?.control);
  });
  control.textContent = showLabel;
  control.setAttribute('aria-expanded', 'false');

  let expanded = false;
  control.addEventListener('click', () => {
    expanded = !expanded;
    if (expanded) {
      content.style.maxHeight = `${content.scrollHeight}px`;
      control.textContent = hideLabel;
      control.setAttribute('aria-expanded', 'true');
    } else {
      content.style.maxHeight = `${maxHeight}px`;
      control.textContent = showLabel;
      control.setAttribute('aria-expanded', 'false');
    }
  });

  onMount(() => {
    if (content.scrollHeight > maxHeight + 1) {
      root.appendChild(control);
    }
    const ro = new ResizeObserver(() => {
      const overflowing = content.scrollHeight > maxHeight + 1;
      if (overflowing && !control.isConnected) root.appendChild(control);
      else if (!overflowing && control.isConnected) control.remove();
    });
    ro.observe(content);
    onCleanup(() => ro.disconnect());
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
