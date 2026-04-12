import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { RatingProps } from './Rating.types';
import './Rating.css';

const STAR =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

export function Rating(props: RatingProps = {}): HTMLElement {
  const {
    value,
    defaultValue = 0,
    count = 5,
    fractions = 1,
    size = 'md',
    color,
    readOnly,
    onChange,
    onHover,
    classNames,
    class: className,
    ref,
  } = props;

  const name = uniqueId('rating');

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-rating', className, classNames?.root);
  root.dataset.size = size;
  if (readOnly) root.dataset.readonly = '';
  if (color) root.style.setProperty('--_rating-color', color);
  root.setAttribute('role', readOnly ? 'img' : 'radiogroup');

  let current = value ?? defaultValue;
  const step = 1 / fractions;

  type SymbolCtx = { group: HTMLElement; fill: HTMLElement };
  const symbols: SymbolCtx[] = [];

  for (let i = 0; i < count; i++) {
    const symbolGroup = document.createElement('span');
    symbolGroup.className = mergeClasses('mkt-rating__symbol-group', classNames?.symbolGroup);

    // empty background
    const bg = document.createElement('span');
    bg.className = 'mkt-rating__symbol-body mkt-rating__symbol-body--bg';
    bg.innerHTML = STAR;
    symbolGroup.appendChild(bg);

    // filled foreground (clipped by width)
    const fillWrap = document.createElement('span');
    fillWrap.className = mergeClasses('mkt-rating__symbol-body', 'mkt-rating__symbol-body--fill', classNames?.symbolBody);
    fillWrap.innerHTML = STAR;
    symbolGroup.appendChild(fillWrap);

    // Fraction interactive labels/inputs
    for (let f = 1; f <= fractions; f++) {
      const fracVal = i + f * step;
      const inputId = `${name}-${i}-${f}`;

      const input = document.createElement('input');
      input.type = 'radio';
      input.className = mergeClasses('mkt-rating__input', classNames?.input);
      input.name = name;
      input.id = inputId;
      input.value = String(fracVal);
      if (readOnly) input.disabled = true;
      if (Math.abs(current - fracVal) < 1e-6) input.checked = true;

      input.addEventListener('change', () => {
        current = fracVal;
        paint(current);
        onChange?.(fracVal);
      });

      const label = document.createElement('label');
      label.className = mergeClasses('mkt-rating__label', classNames?.label);
      label.htmlFor = inputId;
      label.style.width = `${(1 / fractions) * 100}%`;
      label.style.left = `${((f - 1) / fractions) * 100}%`;
      label.setAttribute('aria-label', `${fracVal} of ${count}`);

      label.addEventListener('mouseenter', () => {
        if (readOnly) return;
        paint(fracVal);
        onHover?.(fracVal);
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
    onHover?.(current);
  });

  const paint = (v: number) => {
    symbols.forEach(({ fill }, i) => {
      const pct = Math.max(0, Math.min(1, v - i)) * 100;
      fill.style.width = `${pct}%`;
    });
  };
  paint(current);

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
