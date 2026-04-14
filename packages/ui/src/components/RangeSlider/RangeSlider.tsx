import { onCleanup, _mergeProps } from '@mikata/runtime';
import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { useDirection } from '../../theme';
import type { RangeSliderProps } from './RangeSlider.types';
import './RangeSlider.css';

export function RangeSlider(userProps: RangeSliderProps = {}): HTMLElement {
  const props = _mergeProps(userProps as Record<string, unknown>) as RangeSliderProps;
  const direction = useDirection();

  // Bounds and step are read once at setup. Re-snapping on bound changes at
  // runtime is not supported — recompute the value externally and pass it.
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;
  const minRange = props.minRange ?? 0;
  const label = props.label;

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-range-slider', props.class, props.classNames?.root);
  });
  renderEffect(() => { root.dataset.size = props.size ?? 'md'; });
  renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });
  renderEffect(() => {
    if (props.disabled) root.dataset.disabled = '';
    else delete root.dataset.disabled;
  });

  let [v0, v1] = props.value ?? props.defaultValue ?? [min, max];
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
    renderEffect(() => {
      labelRow.className = mergeClasses('mkt-range-slider__label', props.classNames?.label);
    });
    labelText = document.createElement('span');
    const labelTextEl = labelText;
    renderEffect(() => {
      const l = props.label;
      if (typeof l === 'function') labelTextEl.textContent = l([v0, v1]);
      else labelTextEl.textContent = l == null ? '' : String(l);
    });
    labelRow.appendChild(labelText);
    labelValue = document.createElement('span');
    labelValue.className = 'mkt-range-slider__label-value';
    labelValue.textContent = `${v0} – ${v1}`;
    labelRow.appendChild(labelValue);
    root.appendChild(labelRow);
  }

  const track = document.createElement('div');
  renderEffect(() => {
    track.className = mergeClasses('mkt-range-slider__track', props.classNames?.track);
  });
  root.appendChild(track);

  const bar = document.createElement('div');
  renderEffect(() => {
    bar.className = mergeClasses('mkt-range-slider__bar', props.classNames?.bar);
  });
  track.appendChild(bar);

  const thumbLow = document.createElement('div');
  renderEffect(() => {
    thumbLow.className = mergeClasses('mkt-range-slider__thumb', props.classNames?.thumb);
  });
  thumbLow.setAttribute('role', 'slider');
  renderEffect(() => { thumbLow.setAttribute('tabindex', props.disabled ? '-1' : '0'); });
  thumbLow.setAttribute('aria-valuemin', String(min));
  thumbLow.setAttribute('aria-valuemax', String(max));
  thumbLow.setAttribute('aria-label', 'Minimum');
  track.appendChild(thumbLow);

  const thumbHigh = document.createElement('div');
  renderEffect(() => {
    thumbHigh.className = mergeClasses('mkt-range-slider__thumb', props.classNames?.thumb);
  });
  thumbHigh.setAttribute('role', 'slider');
  renderEffect(() => { thumbHigh.setAttribute('tabindex', props.disabled ? '-1' : '0'); });
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
      props.onValueChange?.([v0, v1]);
    }
    if (emitEnd) props.onValueChangeEnd?.([v0, v1]);
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
    props.onValueChangeEnd?.([v0, v1]);
  };

  const startDrag = (which: 'low' | 'high') => (e: PointerEvent) => {
    if (props.disabled) return;
    dragging = which;
    (which === 'low' ? thumbLow : thumbHigh).focus();
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    e.preventDefault();
  };

  thumbLow.addEventListener('pointerdown', startDrag('low') as EventListener);
  thumbHigh.addEventListener('pointerdown', startDrag('high') as EventListener);

  track.addEventListener('pointerdown', (e) => {
    if (props.disabled) return;
    if (e.target === thumbLow || e.target === thumbHigh) return;
    const v = posToValue((e as PointerEvent).clientX);
    const which = Math.abs(v - v0) <= Math.abs(v - v1) ? 'low' : 'high';
    if (which === 'low') setValues(v, v1, 'low', true);
    else setValues(v0, v, 'high', true);
    dragging = which;
    (which === 'low' ? thumbLow : thumbHigh).focus();
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  const keyStep = (e: KeyboardEvent, which: 'low' | 'high') => {
    if (props.disabled) return;
    const big = step * 10;
    const isRtl = direction() === 'rtl';
    const decKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
    const incKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    let dx = 0;
    if (e.key === decKey || e.key === 'ArrowDown') dx = -step;
    else if (e.key === incKey || e.key === 'ArrowUp') dx = step;
    else switch (e.key) {
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

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }
  return root;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
