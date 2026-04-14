import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { TimelineProps } from './Timeline.types';
import './Timeline.css';

export function Timeline(userProps: TimelineProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as TimelineProps;

  // `items` and `reverseActive` drive the DOM structure — read once.
  const items = props.items;
  const reverseActive = props.reverseActive;

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-timeline', props.class, props.classNames?.root);
  });
  renderEffect(() => { root.dataset.align = props.align ?? 'left'; });
  renderEffect(() => {
    root.style.setProperty('--_tl-bullet-size', `${props.bulletSize ?? 20}px`);
  });
  renderEffect(() => {
    root.style.setProperty('--_tl-line-width', `${props.lineWidth ?? 2}px`);
  });
  renderEffect(() => {
    const c = props.color;
    if (c) root.style.setProperty('--_tl-color', `var(--mkt-color-${c}-6)`);
    else root.style.removeProperty('--_tl-color');
  });

  const itemEls: HTMLElement[] = [];
  items.forEach((it, i) => {
    const item = document.createElement('div');
    renderEffect(() => {
      item.className = mergeClasses('mkt-timeline__item', props.classNames?.item);
    });

    const bullet = document.createElement('span');
    renderEffect(() => {
      bullet.className = mergeClasses('mkt-timeline__item-bullet', props.classNames?.itemBullet);
    });
    if (it.bullet) bullet.appendChild(it.bullet);
    item.appendChild(bullet);

    const body = document.createElement('div');
    renderEffect(() => {
      body.className = mergeClasses('mkt-timeline__item-body', props.classNames?.itemBody);
    });

    if (it.title != null) {
      const t = document.createElement('div');
      renderEffect(() => {
        t.className = mergeClasses('mkt-timeline__item-title', props.classNames?.itemTitle);
      });
      renderEffect(() => {
        const next = props.items[i]?.title;
        if (next == null) t.replaceChildren();
        else if (next instanceof Node) t.replaceChildren(next);
        else t.textContent = String(next);
      });
      body.appendChild(t);
    }

    if (it.children != null) {
      const c = document.createElement('div');
      renderEffect(() => {
        c.className = mergeClasses('mkt-timeline__item-content', props.classNames?.itemContent);
      });
      c.appendChild(it.children);
      body.appendChild(c);
    }

    item.appendChild(body);
    itemEls.push(item);
    root.appendChild(item);
  });

  // Active-state markers react to props.active changes.
  renderEffect(() => {
    const active = props.active ?? -1;
    itemEls.forEach((item, i) => {
      const isActive = reverseActive ? i >= (items.length - 1 - active) : i <= active;
      if (isActive) item.dataset.active = '';
      else delete item.dataset.active;
      if (i === active) item.dataset.current = '';
      else delete item.dataset.current;
    });
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }
  return root;
}
