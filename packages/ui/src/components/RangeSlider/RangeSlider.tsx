import { onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { RangeSliderProps } from './RangeSlider.types';
import './RangeSlider.css';

export function RangeSlider(props: RangeSliderProps = {}): HTMLElement {
  const {
    value,
    defaultValue,
    min = 0,
    max = 100,
    step = 1,
    minRange = 0,
    size = 'md',
    color = 'primary',
    label,
    disabled,
    onValueChange,
    onValueChangeEnd,
    classNames,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-range-slider', className, classNames?.root);
  root.dataset.size = size;
  root.dataset.color = color;
  if (disabled) root.dataset.disabled = '';

  let [v0, v1] = value ?? defaultValue ?? [min, max];
  v0 = clamp(v0, min, max);
  v1 = clamp(v1, min, max);
  if (v1 < v0) [v0, v1] = [v1, v0];

  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  const snap = (n: number) => {
    const snapped = Math.round((n - min) / step) * step + min;
    return clamp(snapped, min, max);
  };

  let labelText: HTMLElement | undefined;
  let labelValue: HTMLElement | undefined;
  if (label) {
    const labelRow = document.createElement('div');
    labelRow.className = mergeClasses('mkt-range-slider__label', classNames?.label);
    labelText = document.createElement('span');
    labelText.textContent = typeof label === 'function' ? label([v0, v1]) : label;
    labelRow.appendChild(labelText);
    labelValue = document.createElement('span');
    labelValue.className = 'mkt-range-slider__label-value';
    labelValue.textContent = `${v0} – ${v1}`;
    labelRow.appendChild(labelValue);
    root.appendChild(labelRow);
  }

  const track = document.createElement('div');
  track.className = mergeClasses('mkt-range-slider__track', classNames?.track);
  root.appendChild(track);

  const bar = document.createElement('div');
  bar.className = mergeClasses('mkt-range-slider__bar', classNames?.bar);
  track.appendChild(bar);

  const thumbLow = document.createElement('div');
  thumbLow.className = mergeClasses('mkt-range-slider__thumb', classNames?.thumb);
  thumbLow.setAttribute('role', 'slider');
  thumbLow.setAttribute('tabindex', disabled ? '-1' : '0');
  thumbLow.setAttribute('aria-valuemin', String(min));
  thumbLow.setAttribute('aria-valuemax', String(max));
  thumbLow.setAttribute('aria-label', 'Minimum');
  track.appendChild(thumbLow);

  const thumbHigh = document.createElement('div');
  thumbHigh.className = mergeClasses('mkt-range-slider__thumb', classNames?.thumb);
  thumbHigh.setAttribute('role', 'slider');
  thumbHigh.setAttribute('tabindex', disabled ? '-1' : '0');
  thumbHigh.setAttribute('aria-valuemin', String(min));
  thumbHigh.setAttribute('aria-valuemax', String(max));
  thumbHigh.setAttribute('aria-label', 'Maximum');
  track.appendChild(thumbHigh);

  const paint = () => {
    const lowPct = pct(v0);
    const highPct = pct(v1);
    bar.style.left = `${lowPct}%`;
    bar.style.width = `${highPct - lowPct}%`;
    thumbLow.style.left = `${lowPct}%`;
    thumbHigh.style.left = `${highPct}%`;
    thumbLow.setAttribute('aria-valuenow', String(v0));
    thumbHigh.setAttribute('aria-valuenow', String(v1));
    if (labelValue) labelValue.textContent = `${v0} – ${v1}`;
    if (labelText && typeof label === 'function') labelText.textContent = label([v0, v1]);
  };
  paint();

  const setValues = (a: number, b: number, which: 'low' | 'high', emitEnd = false) => {
    a = snap(a);
    b = snap(b);
    if (which === 'low') {
      a = Math.min(a, b - minRange);
    } else {
      b = Math.max(b, a + minRange);
    }
    a = clamp(a, min, max);
    b = clamp(b, min, max);
    if (a !== v0 || b !== v1) {
      v0 = a;
      v1 = b;
      paint();
      onValueChange?.([v0, v1]);
    }
    if (emitEnd) onValueChangeEnd?.([v0, v1]);
  };

  const posToValue = (clientX: number): number => {
    const rect = track.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return min + ratio * (max - min);
  };

  let dragging: 'low' | 'high' | null = null;

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const next = posToValue(e.clientX);
    if (dragging === 'low') setValues(next, v1, 'low');
    else setValues(v0, next, 'high');
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = null;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    onValueChangeEnd?.([v0, v1]);
  };

  const startDrag = (which: 'low' | 'high') => (e: PointerEvent) => {
    if (disabled) return;
    dragging = which;
    (which === 'low' ? thumbLow : thumbHigh).focus();
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    e.preventDefault();
  };

  thumbLow.addEventListener('pointerdown', startDrag('low') as any);
  thumbHigh.addEventListener('pointerdown', startDrag('high') as any);

  // Clicking the track moves the nearest thumb
  track.addEventListener('pointerdown', (e) => {
    if (disabled) return;
    if (e.target === thumbLow || e.target === thumbHigh) return;
    const v = posToValue((e as PointerEvent).clientX);
    const which = Math.abs(v - v0) <= Math.abs(v - v1) ? 'low' : 'high';
    if (which === 'low') setValues(v, v1, 'low', true);
    else setValues(v0, v, 'high', true);
    // continue dragging
    dragging = which;
    (which === 'low' ? thumbLow : thumbHigh).focus();
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  const keyStep = (e: KeyboardEvent, which: 'low' | 'high') => {
    if (disabled) return;
    const big = step * 10;
    let dx = 0;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown': dx = -step; break;
      case 'ArrowRight':
      case 'ArrowUp':   dx =  step; break;
      case 'PageDown':  dx = -big;  break;
      case 'PageUp':    dx =  big;  break;
      case 'Home': {
        e.preventDefault();
        if (which === 'low') setValues(min, v1, 'low', true);
        else setValues(v0, v0 + minRange, 'high', true);
        return;
      }
      case 'End': {
        e.preventDefault();
        if (which === 'high') setValues(v0, max, 'high', true);
        else setValues(v1 - minRange, v1, 'low', true);
        return;
      }
      default: return;
    }
    e.preventDefault();
    if (which === 'low') setValues(v0 + dx, v1, 'low', true);
    else setValues(v0, v1 + dx, 'high', true);
  };

  thumbLow.addEventListener('keydown', (e) => keyStep(e as KeyboardEvent, 'low'));
  thumbHigh.addEventListener('keydown', (e) => keyStep(e as KeyboardEvent, 'high'));

  onCleanup(() => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  });

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }
  return root;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
