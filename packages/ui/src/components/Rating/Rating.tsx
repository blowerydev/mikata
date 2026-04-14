import { createIcon } from '@mikata/icons';
import type { IconNode } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
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

  // Structural props read once: count/fractions decide the DOM shape (number
  // of symbols + inputs), and `readOnly` toggles role/input.disabled.
  const count = props.count ?? 5;
  const fractions = props.fractions ?? 1;
  const readOnly = !!props.readOnly;
  const name = uniqueId('rating');

  const root = document.createElement('div');
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

  let current = props.value ?? props.defaultValue ?? 0;
  const step = 1 / fractions;

  type SymbolCtx = { group: HTMLElement; fill: HTMLElement };
  const symbols: SymbolCtx[] = [];

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

    for (let f = 1; f <= fractions; f++) {
      const fracVal = i + f * step;
      const inputId = `${name}-${i}-${f}`;

      const input = document.createElement('input');
      input.type = 'radio';
      renderEffect(() => {
        input.className = mergeClasses('mkt-rating__input', props.classNames?.input);
      });
      input.name = name;
      input.id = inputId;
      input.value = String(fracVal);
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

    symbols.push({ group: symbolGroup, fill: fillWrap });
    root.appendChild(symbolGroup);
  }

  root.addEventListener('mouseleave', () => {
    if (readOnly) return;
    paint(current);
    props.onHover?.(current);
  });

  const paint = (v: number) => {
    symbols.forEach(({ fill }, i) => {
      const pct = Math.max(0, Math.min(1, v - i)) * 100;
      fill.style.width = `${pct}%`;
    });
  };
  paint(current);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
