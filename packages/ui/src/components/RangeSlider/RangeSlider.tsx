import { onCleanup, _mergeProps, adoptElement } from '@mikata/runtime';
import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { useDirection } from '../../theme';
import type { RangeSliderProps } from './RangeSlider.types';
import './RangeSlider.css';

export function RangeSlider(userProps: RangeSliderProps = {}): HTMLElement {
  const props = _mergeProps(userProps as Record<string, unknown>) as RangeSliderProps;
  const direction = useDirection();

  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;
  const minRange = props.minRange ?? 0;
  const label = props.label;

  let [v0, v1] = props.value ?? props.defaultValue ?? [min, max];
  v0 = clamp(v0, min, max);
  v1 = clamp(v1, min, max);
  if (v1 < v0) [v0, v1] = [v1, v0];

  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  const snap = (n: number) => {
    const snapped = Math.round((n - min) / step) * step + min;
    return clamp(snapped, min, max);
  };

  // Element refs captured in setup scope so interaction handlers can
  // mutate visuals without reaching back into closure-heavy locals.
  let labelTextEl: HTMLSpanElement | null = null;
  let labelValueEl: HTMLSpanElement | null = null;
  let trackEl: HTMLDivElement | null = null;
  let barEl: HTMLDivElement | null = null;
  let thumbLowEl: HTMLDivElement | null = null;
  let thumbHighEl: HTMLDivElement | null = null;

  const paint = () => {
    if (!trackEl) return;
    const lowPct = pct(v0);
    const highPct = pct(v1);
    if (barEl) {
      barEl.style.left = `${lowPct}%`;
      barEl.style.width = `${highPct - lowPct}%`;
    }
    if (thumbLowEl) {
      thumbLowEl.style.left = `${lowPct}%`;
      thumbLowEl.setAttribute('aria-valuenow', String(v0));
    }
    if (thumbHighEl) {
      thumbHighEl.style.left = `${highPct}%`;
      thumbHighEl.setAttribute('aria-valuenow', String(v1));
    }
    if (labelValueEl) labelValueEl.textContent = `${v0} – ${v1}`;
    if (labelTextEl && typeof label === 'function') labelTextEl.textContent = label([v0, v1]);
  };

  const setValues = (a: number, b: number, which: 'low' | 'high', emitEnd = false) => {
    a = snap(a);
    b = snap(b);
    if (which === 'low') a = Math.min(a, b - minRange);
    else b = Math.max(b, a + minRange);
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
    if (!trackEl) return min;
    const rect = trackEl.getBoundingClientRect();
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
    (which === 'low' ? thumbLowEl : thumbHighEl)?.focus();
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    e.preventDefault();
  };

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
      case 'PageDown': dx = -big; break;
      case 'PageUp':   dx =  big; break;
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

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-range-slider', props.class, props.classNames?.root);
    });
    renderEffect(() => { root.dataset.size = props.size ?? 'md'; });
    renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });
    renderEffect(() => {
      if (props.disabled) root.dataset.disabled = '';
      else delete root.dataset.disabled;
    });

    if (label) {
      adoptElement<HTMLDivElement>('div', (labelRow) => {
        renderEffect(() => {
          labelRow.className = mergeClasses('mkt-range-slider__label', props.classNames?.label);
        });
        adoptElement<HTMLSpanElement>('span', (t) => {
          labelTextEl = t;
          renderEffect(() => {
            const l = props.label;
            if (typeof l === 'function') t.textContent = l([v0, v1]);
            else t.textContent = l == null ? '' : String(l);
          });
        });
        adoptElement<HTMLSpanElement>('span', (v) => {
          labelValueEl = v;
          v.className = 'mkt-range-slider__label-value';
          if (v.textContent === '') v.textContent = `${v0} – ${v1}`;
        });
      });
    }

    adoptElement<HTMLDivElement>('div', (track) => {
      trackEl = track;
      renderEffect(() => {
        track.className = mergeClasses('mkt-range-slider__track', props.classNames?.track);
      });

      adoptElement<HTMLDivElement>('div', (bar) => {
        barEl = bar;
        renderEffect(() => {
          bar.className = mergeClasses('mkt-range-slider__bar', props.classNames?.bar);
        });
      });

      adoptElement<HTMLDivElement>('div', (thumbLow) => {
        thumbLowEl = thumbLow;
        renderEffect(() => {
          thumbLow.className = mergeClasses('mkt-range-slider__thumb', props.classNames?.thumb);
        });
        thumbLow.setAttribute('role', 'slider');
        renderEffect(() => { thumbLow.setAttribute('tabindex', props.disabled ? '-1' : '0'); });
        thumbLow.setAttribute('aria-valuemin', String(min));
        thumbLow.setAttribute('aria-valuemax', String(max));
        thumbLow.setAttribute('aria-label', 'Minimum');
        thumbLow.addEventListener('pointerdown', startDrag('low') as EventListener);
        thumbLow.addEventListener('keydown', (e) => keyStep(e as KeyboardEvent, 'low'));
      });

      adoptElement<HTMLDivElement>('div', (thumbHigh) => {
        thumbHighEl = thumbHigh;
        renderEffect(() => {
          thumbHigh.className = mergeClasses('mkt-range-slider__thumb', props.classNames?.thumb);
        });
        thumbHigh.setAttribute('role', 'slider');
        renderEffect(() => { thumbHigh.setAttribute('tabindex', props.disabled ? '-1' : '0'); });
        thumbHigh.setAttribute('aria-valuemin', String(min));
        thumbHigh.setAttribute('aria-valuemax', String(max));
        thumbHigh.setAttribute('aria-label', 'Maximum');
        thumbHigh.addEventListener('pointerdown', startDrag('high') as EventListener);
        thumbHigh.addEventListener('keydown', (e) => keyStep(e as KeyboardEvent, 'high'));
      });

      track.addEventListener('pointerdown', (e) => {
        if (props.disabled) return;
        if (e.target === thumbLowEl || e.target === thumbHighEl) return;
        const v = posToValue((e as PointerEvent).clientX);
        const which = Math.abs(v - v0) <= Math.abs(v - v1) ? 'low' : 'high';
        if (which === 'low') setValues(v, v1, 'low', true);
        else setValues(v0, v, 'high', true);
        dragging = which;
        (which === 'low' ? thumbLowEl : thumbHighEl)?.focus();
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    });

    paint();

    onCleanup(() => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
