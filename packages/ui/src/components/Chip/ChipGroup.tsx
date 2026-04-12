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

export function ChipGroup(props: ChipGroupProps = {}): HTMLElement {
  const {
    multiple,
    value,
    defaultValue,
    onChange,
    gap = 'sm',
    children,
    class: className,
    ref,
  } = props;

  const name = uniqueId('chip-group');

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-chip-group', className);
  el.setAttribute('role', multiple ? 'group' : 'radiogroup');
  el.style.display = 'flex';
  el.style.flexWrap = 'wrap';
  el.style.gap = sizeMap[gap] ?? gap;

  const resolved = value ?? defaultValue;
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

  const appendOne = (child: Node) => {
    if (child instanceof HTMLElement) {
      const input = child.querySelector('input.mkt-chip__input') as HTMLInputElement | null;
      if (input) applyToChipInput(input);
    }
    el.appendChild(child);
  };

  if (children) {
    if (Array.isArray(children)) for (const c of children) appendOne(c);
    else appendOne(children);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
