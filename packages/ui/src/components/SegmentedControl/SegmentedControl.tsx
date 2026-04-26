import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { SegmentedControlProps, SegmentedControlItem } from './SegmentedControl.types';
import './SegmentedControl.css';

function normalizeItem(item: string | SegmentedControlItem): SegmentedControlItem {
  return typeof item === 'string' ? { value: item, label: item } : item;
}

/**
 * SegmentedControl uses a CSS-grid wrapper with `repeat(N, 1fr)` columns
 * so every label gets the same width by default. The sliding indicator
 * is an absolutely-positioned element whose width and X-translate come
 * from two custom properties on the wrapper:
 *   --mkt-sc-count = total columns (immutable per render)
 *   --mkt-sc-index = active column index (updates on change)
 *
 * No JS measurement, no rAF, no ResizeObserver. This avoids the
 * dev-mode race where the JS bundle outran the linked stylesheet and
 * the imperative `offsetLeft` read against an unstyled wrapper, leaving
 * the pill at width:0 or off-screen until first user click.
 */
export function SegmentedControl(userProps: SegmentedControlProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as SegmentedControlProps;

  const id = uniqueId('segmented');
  // `data` defines the button set and is read once - reactive item
  // lists need keyed reconcile, not supported here.
  const items = props.data.map(normalizeItem);
  let activeValue = props.value ?? props.defaultValue ?? items[0]?.value ?? '';
  const activeIndex = (): number => {
    const i = items.findIndex((it) => it.value === activeValue);
    return i < 0 ? 0 : i;
  };

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
    renderEffect(() => {
      const label = props.ariaLabel ?? props['aria-label'];
      if (label) root.setAttribute('aria-label', label);
      else root.removeAttribute('aria-label');
    });

    // Column count is structural - set once and forget. The active
    // index is updated by `commitActive` whenever a change occurs.
    root.style.setProperty('--mkt-sc-count', String(items.length));
    root.style.setProperty('--mkt-sc-index', String(activeIndex()));

    // Indicator slot. Width and position are entirely CSS-driven from
    // the two custom properties; this component only owns the class.
    adoptElement<HTMLDivElement>('div', (indicator) => {
      renderEffect(() => {
        indicator.className = mergeClasses(
          'mkt-segmented-control__indicator',
          props.classNames?.indicator,
        );
      });
    });

    const labels: HTMLLabelElement[] = [];
    const inputs: HTMLInputElement[] = [];

    function syncActive(): void {
      root.style.setProperty('--mkt-sc-index', String(activeIndex()));
      labels.forEach((label, i) => {
        const active = items[i].value === activeValue;
        if (active) label.dataset.active = '';
        else delete label.dataset.active;
        if (inputs[i]) inputs[i].checked = active;
      });
    }

    function commitActive(next: string): void {
      activeValue = next;
      props.onChange?.(activeValue);
      syncActive();
    }

    renderEffect(() => {
      if (props.value === undefined || props.value === activeValue) return;
      activeValue = props.value;
      syncActive();
    });

    // Hydration path: SSR already emitted radio + label pairs. Pair
    // them positionally - the server-side `uniqueId` counter persists
    // across requests / routes (a single Node process renders many
    // pages back-to-back) while the client always starts at zero, so
    // SSR ids like `segmented-3-0` don't line up with what a fresh
    // client computes. Querying by class and pairing positionally
    // sidesteps the id mismatch entirely.
    const existing = root.querySelectorAll<HTMLLabelElement>('.mkt-segmented-control__label');
    if (existing.length === items.length) {
      const existingInputs = root.querySelectorAll<HTMLInputElement>('.mkt-segmented-control__input');
      existing.forEach((label, i) => {
        labels.push(label);
        const input = existingInputs[i];
        if (!input) return;
        inputs.push(input);
        // Sync SSR `checked` and label `data-active` to client
        // activeValue. The server can't see localStorage / browser-only
        // sources, so SSR may have flagged the wrong option; without
        // this sync the user can never select that option as their
        // first action because the browser only fires `change` on
        // transitions.
        if (items[i].ariaLabel) input.setAttribute('aria-label', items[i].ariaLabel);
        else input.removeAttribute('aria-label');
        input.checked = items[i].value === activeValue;
        if (items[i].value === activeValue) label.dataset.active = '';
        else delete label.dataset.active;
        if (items[i].title) label.title = items[i].title;
        else label.removeAttribute('title');
        input.addEventListener('change', () => {
          if (items[i].disabled) return;
          commitActive(items[i].value);
        });
      });
    } else {
      items.forEach((item, index) => {
        const inputId = `${id}-${index}`;

        const input = document.createElement('input');
        input.setAttribute('type', 'radio');
        input.setAttribute('name', id);
        input.id = inputId;
        input.setAttribute('value', item.value);
        if (item.ariaLabel) input.setAttribute('aria-label', item.ariaLabel);
        input.className = mergeClasses('mkt-segmented-control__input', props.classNames?.input);
        input.checked = item.value === activeValue;
        if (item.disabled) input.disabled = true;
        input.addEventListener('change', () => {
          if (item.disabled) return;
          commitActive(item.value);
        });
        root.appendChild(input);

        const label = document.createElement('label');
        label.className = mergeClasses('mkt-segmented-control__label', props.classNames?.label);
        label.htmlFor = inputId;
        if (item.title) label.title = item.title;
        const norm = typeof props.data[index] === 'string'
          ? (props.data[index] as string)
          : (props.data[index] as SegmentedControlItem)?.label;
        if (norm == null) label.replaceChildren();
        else if (norm instanceof Node) label.replaceChildren(norm);
        else label.textContent = String(norm);
        if (item.value === activeValue) label.dataset.active = '';
        if (item.disabled) label.dataset.disabled = '';

        inputs.push(input);
        labels.push(label);
        root.appendChild(label);
      });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
