import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { SegmentedControlProps, SegmentedControlItem } from './SegmentedControl.types';
import './SegmentedControl.css';

function normalizeItem(item: string | SegmentedControlItem): SegmentedControlItem {
  return typeof item === 'string' ? { value: item, label: item } : item;
}

export function SegmentedControl(userProps: SegmentedControlProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as SegmentedControlProps;

  const id = uniqueId('segmented');
  // `data` defines the button set and is read once - reactive item
  // lists need keyed reconcile, not supported here.
  const items = props.data.map(normalizeItem);
  let activeValue = props.value ?? props.defaultValue ?? items[0]?.value ?? '';

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses(
        'mkt-segmented-control',
        props.fullWidth && 'mkt-segmented-control--full-width',
        props.class,
        props.classNames?.root,
      );
    });
    renderEffect(() => { root.dataset.size = props.size ?? 'sm'; });
    renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });
    root.setAttribute('role', 'radiogroup');

    let indicatorEl: HTMLDivElement | null = null;
    adoptElement<HTMLDivElement>('div', (indicator) => {
      indicatorEl = indicator;
      renderEffect(() => {
        indicator.className = mergeClasses('mkt-segmented-control__indicator', props.classNames?.indicator);
      });
    });

    const labels: HTMLLabelElement[] = [];

    // Items list is structural. On hydration, the SSR already built
    // the radio/label pairs; we need references to the labels to move
    // the indicator later. Rather than rebuild, walk the adopted
    // children and re-wire.
    //
    // Match inputs to labels by document order, not by id. The
    // server-side `uniqueId` counter persists across requests / routes
    // (a single Node process renders many pages back-to-back) while
    // the client always starts at zero, so SSR ids like `segmented-3-0`
    // don't line up with what a fresh client computes. Querying by
    // class and pairing positionally sidesteps the mismatch entirely.
    const existing = root.querySelectorAll<HTMLLabelElement>('.mkt-segmented-control__label');
    if (existing.length === items.length) {
      const inputs = root.querySelectorAll<HTMLInputElement>('.mkt-segmented-control__input');
      existing.forEach((label, i) => {
        labels.push(label);
        const input = inputs[i];
        if (input) {
          // Sync the SSR's `checked` to the client's activeValue. The
          // server can't see localStorage / browser-only sources, so it
          // marks `checked` on whatever the SSR-time default was. If the
          // client value differs (e.g. stored theme is 'light' but SSR
          // assumed 'auto'), the radio with the SSR-checked value is
          // still flagged checked in the DOM - clicking its label is
          // a no-op (the browser fires `change` only on transitions),
          // so the user can never select that option as their first
          // action without bouncing through another one first.
          input.checked = items[i].value === activeValue;
          // Same reason for `data-active` on the label.
          if (items[i].value === activeValue) label.dataset.active = '';
          else delete label.dataset.active;
          input.addEventListener('change', () => {
            if (items[i].disabled) return;
            activeValue = items[i].value;
            props.onChange?.(activeValue);
            updateIndicator();
            updateActive();
          });
        }
      });
    } else {
      items.forEach((item, index) => {
        const inputId = `${id}-${index}`;

        const input = document.createElement('input');
        input.setAttribute('type', 'radio');
        input.setAttribute('name', id);
        input.id = inputId;
        input.setAttribute('value', item.value);
        input.className = mergeClasses('mkt-segmented-control__input', props.classNames?.input);
        input.checked = item.value === activeValue;
        if (item.disabled) input.disabled = true;

        input.addEventListener('change', () => {
          if (item.disabled) return;
          activeValue = item.value;
          props.onChange?.(activeValue);
          updateIndicator();
          updateActive();
        });

        root.appendChild(input);

        const label = document.createElement('label');
        label.className = mergeClasses('mkt-segmented-control__label', props.classNames?.label);
        label.htmlFor = inputId;
        const norm = typeof props.data[index] === 'string'
          ? (props.data[index] as string)
          : (props.data[index] as SegmentedControlItem)?.label;
        if (norm == null) label.replaceChildren();
        else if (norm instanceof Node) label.replaceChildren(norm);
        else label.textContent = String(norm);
        if (item.value === activeValue) label.dataset.active = '';
        if (item.disabled) label.dataset.disabled = '';

        labels.push(label);
        root.appendChild(label);
      });
    }

    function updateActive() {
      labels.forEach((label, i) => {
        if (items[i].value === activeValue) label.dataset.active = '';
        else delete label.dataset.active;
      });
    }

    function applyIndicator() {
      if (!indicatorEl) return;
      const activeIndex = items.findIndex((item) => item.value === activeValue);
      if (activeIndex < 0) return;
      const activeLabel = labels[activeIndex];
      if (!activeLabel) return;
      // `getBoundingClientRect()` gives sub-pixel-accurate dimensions and
      // works on labels whose layout box exists but offsetWidth is 0 (some
      // inline-flex configurations on Chromium hand back 0 for offsetWidth
      // for a frame or two after first paint while CSS containment
      // resolves). The bounding rect reflects the actual painted box.
      const rect = activeLabel.getBoundingClientRect();
      if (rect.width === 0) return;
      const parent = activeLabel.offsetParent as HTMLElement | null;
      const isRtl = parent ? getComputedStyle(parent).direction === 'rtl' : false;
      const startOffset = isRtl && parent
        ? -(parent.clientWidth - activeLabel.offsetLeft - rect.width)
        : activeLabel.offsetLeft;
      indicatorEl.style.width = `${rect.width}px`;
      indicatorEl.style.transform = `translateX(${startOffset}px)`;
    }

    function updateIndicator() {
      // Inner rAF lets layout settle after activeValue / class changes so
      // offsetLeft / offsetWidth read the post-update values.
      requestAnimationFrame(applyIndicator);
    }

    // Initial measurement strategy: try synchronously, then on rAF, then
    // again on every label resize. `applyIndicator` no-ops when width is
    // still 0, so each attempt is a cheap miss until the layout has a
    // real box. ResizeObserver fires once per observed element on the
    // microtask after `observe()`, which catches the common case where
    // the rAF fires before SVGs / fonts have laid out. The observer also
    // continues firing for window resize / RTL flips / theme zoom.
    //
    // Skip entirely during SSR - the dom-shim's SElement has no
    // `getBoundingClientRect` / `offsetParent`, and there's nothing to
    // measure on the server anyway. The post-hydration rAF handles the
    // first real measurement on the client.
    if (typeof window !== 'undefined') {
      applyIndicator();
      requestAnimationFrame(applyIndicator);
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => applyIndicator());
        labels.forEach((l) => ro.observe(l));
      } else {
        // Fallback for ancient browsers: a couple of timer-based
        // retries cover the same window without observing.
        setTimeout(applyIndicator, 50);
        setTimeout(applyIndicator, 200);
      }
      // Re-measure once everything (CSS, web fonts, late-loading icon
      // SVGs) has finished. In dev, modules can execute before linked
      // stylesheets parse - the first rAF then reads pre-CSS layout
      // (no `position: relative` on the wrapper, so `offsetLeft`
      // resolves against the document body and pushes the pill off
      // screen). `load` fires after all resources are in. `fonts.ready`
      // covers the additional font-metrics-changed-the-pill-size path.
      window.addEventListener('load', applyIndicator, { once: true });
      const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
      if (fonts?.ready) fonts.ready.then(applyIndicator);
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
