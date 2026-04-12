import { onMount, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { SpoilerProps } from './Spoiler.types';
import './Spoiler.css';

export function Spoiler(props: SpoilerProps): HTMLElement {
  const {
    maxHeight = 100,
    showLabel = 'Show more',
    hideLabel = 'Hide',
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-spoiler', className, classNames?.root);

  const content = document.createElement('div');
  content.className = mergeClasses('mkt-spoiler__content', classNames?.content);
  content.style.maxHeight = `${maxHeight}px`;
  content.appendChild(children);
  root.appendChild(content);

  const control = document.createElement('button');
  control.type = 'button';
  control.className = mergeClasses('mkt-spoiler__control', classNames?.control);
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

  // Only show the control if content overflows
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

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
