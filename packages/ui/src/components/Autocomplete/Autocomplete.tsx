import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { AutocompleteProps } from './Autocomplete.types';
import './Autocomplete.css';

export function Autocomplete(props: AutocompleteProps): HTMLDivElement {
  const {
    data,
    value,
    defaultValue = '',
    placeholder,
    label,
    description,
    error,
    required,
    disabled,
    size = 'md',
    limit = 8,
    onChange,
    onOptionSubmit,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('autocomplete');
  const listId = `${id}-list`;

  const container = document.createElement('div');
  container.className = mergeClasses('mkt-autocomplete', classNames?.root);

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.className = mergeClasses('mkt-autocomplete__input', classNames?.input);
  input.dataset.size = size;
  input.autocomplete = 'off';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listId);
  if (placeholder) input.placeholder = placeholder;
  if (disabled) input.disabled = true;
  if (required) input.setAttribute('aria-required', 'true');
  if (error) input.setAttribute('aria-invalid', 'true');
  input.value = value ?? defaultValue;

  const dropdown = document.createElement('ul');
  dropdown.id = listId;
  dropdown.className = mergeClasses('mkt-autocomplete__dropdown', classNames?.dropdown);
  dropdown.setAttribute('role', 'listbox');
  dropdown.hidden = true;

  let activeIdx = -1;
  let current: string[] = [];

  const close = () => {
    dropdown.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    activeIdx = -1;
  };

  const commit = (v: string) => {
    input.value = v;
    onChange?.(v);
    onOptionSubmit?.(v);
    close();
  };

  const render = () => {
    const q = input.value.trim().toLowerCase();
    current = (q ? data.filter((d) => d.toLowerCase().includes(q)) : data).slice(0, limit);
    dropdown.textContent = '';
    if (!current.length) {
      close();
      return;
    }
    current.forEach((opt, i) => {
      const li = document.createElement('li');
      li.className = mergeClasses('mkt-autocomplete__option', classNames?.option);
      li.setAttribute('role', 'option');
      li.id = `${id}-opt-${i}`;
      li.textContent = opt;
      if (i === activeIdx) li.dataset.active = '';
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        commit(opt);
      });
      dropdown.appendChild(li);
    });
    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', () => {
    onChange?.(input.value);
    activeIdx = -1;
    render();
  });

  input.addEventListener('focus', render);
  input.addEventListener('blur', () => setTimeout(close, 120));

  input.addEventListener('keydown', (e) => {
    if (dropdown.hidden) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        render();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % current.length;
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + current.length) % current.length;
      render();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        e.preventDefault();
        commit(current[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      close();
    }
  });

  container.appendChild(input);
  container.appendChild(dropdown);

  if (ref) {
    if (typeof ref === 'function') ref(input as any);
    else (ref as any).current = input;
  }

  return InputWrapper({
    id,
    label,
    description,
    error,
    required,
    class: className,
    classNames,
    children: container,
  });
}
