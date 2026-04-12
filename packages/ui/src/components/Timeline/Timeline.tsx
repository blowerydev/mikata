import { mergeClasses } from '../../utils/class-merge';
import type { TimelineProps } from './Timeline.types';
import './Timeline.css';

export function Timeline(props: TimelineProps): HTMLElement {
  const {
    items,
    active = -1,
    align = 'left',
    bulletSize = 20,
    lineWidth = 2,
    color,
    reverseActive,
    classNames,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-timeline', className, classNames?.root);
  root.dataset.align = align;
  root.style.setProperty('--_tl-bullet-size', `${bulletSize}px`);
  root.style.setProperty('--_tl-line-width', `${lineWidth}px`);
  if (color) root.style.setProperty('--_tl-color', `var(--mkt-color-${color}-6)`);

  items.forEach((it, i) => {
    const item = document.createElement('div');
    item.className = mergeClasses('mkt-timeline__item', classNames?.item);
    const isActive = reverseActive ? i >= (items.length - 1 - active) : i <= active;
    if (isActive) item.dataset.active = '';
    if (i === active) item.dataset.current = '';

    const bullet = document.createElement('span');
    bullet.className = mergeClasses('mkt-timeline__item-bullet', classNames?.itemBullet);
    if (it.bullet) bullet.appendChild(it.bullet);
    item.appendChild(bullet);

    const body = document.createElement('div');
    body.className = mergeClasses('mkt-timeline__item-body', classNames?.itemBody);

    if (it.title != null) {
      const t = document.createElement('div');
      t.className = mergeClasses('mkt-timeline__item-title', classNames?.itemTitle);
      if (it.title instanceof Node) t.appendChild(it.title);
      else t.textContent = it.title;
      body.appendChild(t);
    }

    if (it.children != null) {
      const c = document.createElement('div');
      c.className = mergeClasses('mkt-timeline__item-content', classNames?.itemContent);
      c.appendChild(it.children);
      body.appendChild(c);
    }

    item.appendChild(body);
    root.appendChild(item);
  });

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }
  return root;
}
