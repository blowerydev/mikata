import { createIcon } from '../../internal/icons';
import type { IconNode } from '../../internal/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { RatingProps } from './Rating.types';
import './Rating.css';

const STAR_NODE: IconNode = [
  'svg',
  { viewBox: '0 0 24 24', fill: 'currentColor' },
  [
    [
      'path',
      {
        d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      },
    ],
  ],
];
const createStar = () => createIcon(STAR_NODE);

export function Rating(userProps: RatingProps = {}): HTMLElement {
  const props = _mergeProps(userProps as Record<string, unknown>) as RatingProps;

  const count = props.count ?? 5;
  const fractions = props.fractions ?? 1;
  const readOnly = !!props.readOnly;
  const name = uniqueId('rating');

  let current = props.value ?? props.defaultValue ?? 0;
  const step = 1 / fractions;

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-rating', props.class, props.classNames?.root);
    });
    renderEffect(() => { root.dataset.size = props.size ?? 'md'; });
    if (readOnly) root.dataset.readonly = '';
    renderEffect(() => {
      const c = props.color;
      if (c) root.style.setProperty('--_rating-color', c);
      else root.style.removeProperty('--_rating-color');
    });
    root.setAttribute('role', readOnly ? 'img' : 'radiogroup');

    // The star/input tree is a pure function of `count` and `fractions`
    // which are fixed at setup. Only build it on fresh renders - on
    // hydration the SSR already has it. We still need references to
    // the fill spans so post-hydrate interaction can update them.
    const fillSpans: HTMLElement[] = [];

    const paint = (v: number) => {
      for (let i = 0; i < fillSpans.length; i++) {
        const pct = Math.max(0, Math.min(1, v - i)) * 100;
        fillSpans[i].style.width = `${pct}%`;
      }
    };

    if (root.firstChild) {
      // Hydrate path: grab references to the SSR fill spans in order.
      const groups = root.querySelectorAll('.mkt-rating__symbol-group');
      groups.forEach((g) => {
        const fill = g.querySelector('.mkt-rating__symbol-body--fill');
        if (fill) fillSpans.push(fill as HTMLElement);
      });
      // Re-wire events on the existing inputs.
      for (let i = 0; i < count; i++) {
        for (let f = 1; f <= fractions; f++) {
          const fracVal = i + f * step;
          const inputId = `${name}-${i}-${f}`;
          const input = root.querySelector(`#${CSS.escape(inputId)}`) as HTMLInputElement | null;
          if (!input) continue;
          input.addEventListener('change', () => {
            current = fracVal;
            paint(current);
            props.onChange?.(fracVal);
          });
          const label = root.querySelector(`label[for="${inputId}"]`);
          label?.addEventListener('mouseenter', () => {
            if (readOnly) return;
            paint(fracVal);
            props.onHover?.(fracVal);
          });
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        const symbolGroup = document.createElement('span');
        renderEffect(() => {
          symbolGroup.className = mergeClasses('mkt-rating__symbol-group', props.classNames?.symbolGroup);
        });

        const bg = document.createElement('span');
        bg.className = 'mkt-rating__symbol-body mkt-rating__symbol-body--bg';
        bg.appendChild(createStar());
        symbolGroup.appendChild(bg);

        const fillWrap = document.createElement('span');
        renderEffect(() => {
          fillWrap.className = mergeClasses('mkt-rating__symbol-body', 'mkt-rating__symbol-body--fill', props.classNames?.symbolBody);
        });
        fillWrap.appendChild(createStar());
        symbolGroup.appendChild(fillWrap);
        fillSpans.push(fillWrap);

        for (let f = 1; f <= fractions; f++) {
          const fracVal = i + f * step;
          const inputId = `${name}-${i}-${f}`;

          const input = document.createElement('input');
          input.setAttribute('type', 'radio');
          renderEffect(() => {
            input.className = mergeClasses('mkt-rating__input', props.classNames?.input);
          });
          input.setAttribute('name', name);
          input.id = inputId;
          input.setAttribute('value', String(fracVal));
          if (readOnly) input.disabled = true;
          if (Math.abs(current - fracVal) < 1e-6) input.checked = true;

          input.addEventListener('change', () => {
            current = fracVal;
            paint(current);
            props.onChange?.(fracVal);
          });

          const label = document.createElement('label');
          renderEffect(() => {
            label.className = mergeClasses('mkt-rating__label', props.classNames?.label);
          });
          label.htmlFor = inputId;
          label.style.width = `${(1 / fractions) * 100}%`;
          label.style.left = `${((f - 1) / fractions) * 100}%`;
          label.setAttribute('aria-label', `${fracVal} of ${count}`);

          label.addEventListener('mouseenter', () => {
            if (readOnly) return;
            paint(fracVal);
            props.onHover?.(fracVal);
          });

          symbolGroup.appendChild(input);
          symbolGroup.appendChild(label);
        }

        root.appendChild(symbolGroup);
      }
    }

    root.addEventListener('mouseleave', () => {
      if (readOnly) return;
      paint(current);
      props.onHover?.(current);
    });

    paint(current);

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
