import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { uniqueId } from '../../utils/unique-id';
import { mergeClasses } from '../../utils/class-merge';
import type { ChipGroupProps } from './ChipGroup.types';

const sizeMap: Record<string, string> = {
  xs: 'var(--mkt-space-1)',
  sm: 'var(--mkt-space-2)',
  md: 'var(--mkt-space-3)',
  lg: 'var(--mkt-space-4)',
  xl: 'var(--mkt-space-5)',
};

export function ChipGroup(userProps: ChipGroupProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ChipGroupProps;

  // `multiple`, `value`/`defaultValue`, `children`, `onChange` are structural -
  // they decide name/role, initial selection, and chip wiring at setup.
  const multiple = props.multiple;
  const children = props.children;
  const onChange = props.onChange;

  const name = uniqueId('chip-group');

  const resolved = props.value ?? props.defaultValue;
  const selected = new Set<string>(
    resolved == null ? [] : Array.isArray(resolved) ? resolved : [resolved],
  );

  const applyToChipInput = (input: HTMLInputElement) => {
    input.type = multiple ? 'checkbox' : 'radio';
    if (!multiple) input.name = name;
    if (input.value && selected.has(input.value)) input.checked = true;
    input.addEventListener('change', () => {
      if (multiple) {
        if (input.checked) selected.add(input.value);
        else selected.delete(input.value);
        onChange?.(Array.from(selected));
      } else {
        if (input.checked) onChange?.(input.value);
      }
    });
  };

  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-chip-group', props.class);
    });
    el.setAttribute('role', multiple ? 'group' : 'radiogroup');
    el.style.display = 'flex';
    el.style.flexWrap = 'wrap';
    renderEffect(() => {
      const gap = props.gap ?? 'sm';
      el.style.gap = sizeMap[gap] ?? gap;
    });

    const appendOne = (child: Node) => {
      if (child instanceof HTMLElement) {
        const input = child.querySelector('input.mkt-chip__input') as HTMLInputElement | null;
        if (input) applyToChipInput(input);
      }
      if (child.parentNode !== el) el.appendChild(child);
    };

    if (children) {
      if (Array.isArray(children)) for (const c of children) appendOne(c);
      else appendOne(children);
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
