import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { useUILabels } from '../../utils/use-i18n-optional';
import { InputWrapper } from '../_internal/InputWrapper';
import type { MultiSelectProps, MultiSelectOption } from './MultiSelect.types';
import './MultiSelect.css';

const normalize = (data: (string | MultiSelectOption)[]): MultiSelectOption[] =>
  data.map((d) => (typeof d === 'string' ? { value: d, label: d } : d));

export function MultiSelect(props: MultiSelectProps): HTMLDivElement {
  const {
    data,
    value,
    defaultValue = [],
    placeholder,
    label,
    description,
    error,
    required,
    disabled,
    size = 'md',
    maxValues,
    searchable = true,
    clearable,
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('multi-select');
  const listId = `${id}-list`;
  const options = normalize(data);
  const labels = useUILabels();

  const selected = new Set<string>(value ?? defaultValue);

  const control = document.createElement('div');
  control.className = mergeClasses('mkt-multi-select', classNames?.control);
  control.dataset.size = size;
  if (disabled) control.dataset.disabled = '';
  if (error) control.dataset.invalid = '';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.className = mergeClasses('mkt-multi-select__input', classNames?.input);
  input.autocomplete = 'off';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listId);
  input.setAttribute('aria-multiselectable', 'true');
  if (placeholder) input.placeholder = placeholder;
  if (disabled) input.disabled = true;
  if (!searchable) input.readOnly = true;
  if (required) input.setAttribute('aria-required', 'true');
  if (error) input.setAttribute('aria-invalid', 'true');

  const dropdown = document.createElement('ul');
  dropdown.id = listId;
  dropdown.className = mergeClasses('mkt-multi-select__dropdown', classNames?.dropdown);
  dropdown.setAttribute('role', 'listbox');
  dropdown.hidden = true;

  let activeIdx = -1;
  let currentFiltered: MultiSelectOption[] = [];

  const emit = () => onChange?.(Array.from(selected));

  const removePill = (v: string) => {
    selected.delete(v);
    renderPills();
    renderDropdown();
    emit();
  };

  const renderPills = () => {
    // remove old pills
    Array.from(control.querySelectorAll('.mkt-multi-select__pill')).forEach((el) => el.remove());
    const frag = document.createDocumentFragment();
    for (const opt of options) {
      if (!selected.has(opt.value)) continue;
      const pill = document.createElement('span');
      pill.className = mergeClasses('mkt-multi-select__pill', classNames?.pill);
      pill.textContent = opt.label;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = mergeClasses('mkt-multi-select__pill-remove', classNames?.pillRemove);
      rm.setAttribute('aria-label', `${labels.remove}: ${opt.label}`);
      rm.innerHTML =
        '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5">' +
        '<path d="M3 3L9 9M9 3L3 9"/></svg>';
      rm.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (disabled) return;
        removePill(opt.value);
      });
      pill.appendChild(rm);
      frag.appendChild(pill);
    }
    control.insertBefore(frag, input);
  };

  const close = () => {
    dropdown.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    activeIdx = -1;
  };

  const toggleOption = (opt: MultiSelectOption) => {
    if (opt.disabled) return;
    if (selected.has(opt.value)) selected.delete(opt.value);
    else {
      if (maxValues != null && selected.size >= maxValues) return;
      selected.add(opt.value);
    }
    input.value = '';
    renderPills();
    renderDropdown();
    emit();
  };

  const renderDropdown = () => {
    const q = input.value.trim().toLowerCase();
    currentFiltered = options.filter((o) => !q || o.label.toLowerCase().includes(q));
    dropdown.textContent = '';
    if (!currentFiltered.length) {
      const li = document.createElement('li');
      li.className = 'mkt-multi-select__empty';
      li.textContent = labels.noResults;
      dropdown.appendChild(li);
      dropdown.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }
    currentFiltered.forEach((opt, i) => {
      const li = document.createElement('li');
      li.className = mergeClasses('mkt-multi-select__option', classNames?.option);
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', selected.has(opt.value) ? 'true' : 'false');
      if (selected.has(opt.value)) li.dataset.selected = '';
      if (opt.disabled) li.dataset.disabled = '';
      if (i === activeIdx) li.dataset.active = '';
      li.textContent = opt.label;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        toggleOption(opt);
      });
      dropdown.appendChild(li);
    });
    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('focus', renderDropdown);
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('input', () => {
    activeIdx = -1;
    renderDropdown();
  });
  input.addEventListener('keydown', (e) => {
    if (dropdown.hidden && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      renderDropdown();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % currentFiltered.length;
      renderDropdown();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + currentFiltered.length) % currentFiltered.length;
      renderDropdown();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        e.preventDefault();
        toggleOption(currentFiltered[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      close();
    } else if (e.key === 'Backspace' && !input.value && selected.size > 0) {
      // remove last selected
      const last = Array.from(selected).pop();
      if (last) removePill(last);
    }
  });

  control.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.mkt-multi-select__pill-remove')) return;
    input.focus();
  });

  control.appendChild(input);

  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-multi-select__root';
  wrapper.appendChild(control);
  wrapper.appendChild(dropdown);

  if (clearable) {
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'mkt-multi-select__clear';
    clear.setAttribute('aria-label', labels.clear);
    clear.innerHTML =
      '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M3 3L9 9M9 3L3 9"/></svg>';
    clear.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selected.clear();
      renderPills();
      renderDropdown();
      emit();
    });
    control.appendChild(clear);
  }

  renderPills();

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
    children: wrapper,
  });
}
