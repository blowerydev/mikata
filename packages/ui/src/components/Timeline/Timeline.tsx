import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { TimelineProps } from './Timeline.types';
import './Timeline.css';

export function Timeline(userProps: TimelineProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as TimelineProps;

  const items = props.items;
  const reverseActive = props.reverseActive;
  const itemEls: HTMLElement[] = [];

  return adoptElement<HTMLElement>('div', (root) => {
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

    items.forEach((it, i) => {
      adoptElement<HTMLDivElement>('div', (item) => {
        renderEffect(() => {
          item.className = mergeClasses('mkt-timeline__item', props.classNames?.item);
        });
        itemEls[i] = item;

        adoptElement<HTMLSpanElement>('span', (bullet) => {
          renderEffect(() => {
            bullet.className = mergeClasses('mkt-timeline__item-bullet', props.classNames?.itemBullet);
          });
          if (it.bullet && !bullet.firstChild) bullet.appendChild(it.bullet);
        });

        adoptElement<HTMLDivElement>('div', (body) => {
          renderEffect(() => {
            body.className = mergeClasses('mkt-timeline__item-body', props.classNames?.itemBody);
          });

          if (it.title != null) {
            adoptElement<HTMLDivElement>('div', (t) => {
              renderEffect(() => {
                t.className = mergeClasses('mkt-timeline__item-title', props.classNames?.itemTitle);
              });
              renderEffect(() => {
                const next = props.items[i]?.title;
                if (next == null) t.replaceChildren();
                else if (next instanceof Node) t.replaceChildren(next);
                else t.textContent = String(next);
              });
            });
          }

          if (it.children != null) {
            adoptElement<HTMLDivElement>('div', (c) => {
              renderEffect(() => {
                c.className = mergeClasses('mkt-timeline__item-content', props.classNames?.itemContent);
              });
              if (it.children && it.children.parentNode !== c) c.appendChild(it.children);
            });
          }
        });
      });
    });

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
  });
}
