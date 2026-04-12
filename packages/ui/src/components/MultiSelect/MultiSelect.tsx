import { createIcon, Close } from '@mikata/icons';
import { onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { useUILabels } from '../../utils/use-i18n-optional';
import { createAsyncDataController } from '../../utils/async-data';
import { InputWrapper } from '../_internal/InputWrapper';
import type { MultiSelectProps, MultiSelectOption, MultiSelectFetcher } from './MultiSelect.types';
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
    debounceMs,
    loadingLabel,
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('multi-select');
  const listId = `${id}-list`;
  const isAsync = typeof data === 'function';
  const fetcher = isAsync ? (data as MultiSelectFetcher) : null;
  // Pool of known options (covers statically-provided data and every async
  // result we've seen). Needed so pills keep their label after the query
  // changes and the option drops out of the visible list.
  let options: MultiSelectOption[] = isAsync ? [] : normalize(data as (string | MultiSelectOption)[]);
  const optionByValue = new Map<string, MultiSelectOption>();
  for (const opt of options) optionByValue.set(opt.value, opt);
  const labels = useUILabels();
  const resolvedLoadingLabel = loadingLabel ?? labels.loading ?? 'Loading…';

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
  let loading = false;
  // Keyed reconciliation by option value — see Autocomplete for the same
  // pattern. Avoids full dropdown rebuild on each keystroke.
  const liByValue = new Map<string, HTMLLIElement>();
  let emptyLi: HTMLLIElement | null = null;
  let loadingLi: HTMLLIElement | null = null;

  const emit = () => onChange?.(Array.from(selected));

  const labelFor = (v: string): string => optionByValue.get(v)?.label ?? v;

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
    for (const v of selected) {
      const lbl = labelFor(v);
      const pill = document.createElement('span');
      pill.className = mergeClasses('mkt-multi-select__pill', classNames?.pill);
      pill.textContent = lbl;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = mergeClasses('mkt-multi-select__pill-remove', classNames?.pillRemove);
      rm.setAttribute('aria-label', `${labels.remove}: ${lbl}`);
      rm.appendChild(createIcon(Close, { size: 10, strokeWidth: 1.5 }));
      rm.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (disabled) return;
        removePill(v);
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
    if (isAsync) {
      // Remote: the pool already reflects the latest results for this query.
      currentFiltered = options.slice();
    } else {
      currentFiltered = options.filter((o) => !q || o.label.toLowerCase().includes(q));
    }

    // Loading state: show the spinner row; clear any stale option rows.
    if (loading) {
      for (const li of liByValue.values()) li.remove();
      liByValue.clear();
      if (emptyLi && emptyLi.parentNode === dropdown) emptyLi.remove();
      if (!loadingLi) {
        loadingLi = document.createElement('li');
        loadingLi.className = mergeClasses('mkt-multi-select__loading', classNames?.loading);
        loadingLi.setAttribute('aria-live', 'polite');
        loadingLi.textContent = resolvedLoadingLabel;
      }
      if (loadingLi.parentNode !== dropdown) dropdown.appendChild(loadingLi);
      dropdown.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    if (loadingLi && loadingLi.parentNode === dropdown) loadingLi.remove();

    if (!currentFiltered.length) {
      for (const li of liByValue.values()) li.remove();
      liByValue.clear();
      if (!emptyLi) {
        emptyLi = document.createElement('li');
        emptyLi.className = 'mkt-multi-select__empty';
        emptyLi.textContent = labels.noResults;
      }
      if (emptyLi.parentNode !== dropdown) dropdown.appendChild(emptyLi);
      dropdown.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    if (emptyLi && emptyLi.parentNode === dropdown) emptyLi.remove();

    const seen = new Set<string>();
    let prev: HTMLLIElement | null = null;
    currentFiltered.forEach((opt, i) => {
      seen.add(opt.value);
      let li = liByValue.get(opt.value);
      if (!li) {
        li = document.createElement('li');
        li.className = mergeClasses('mkt-multi-select__option', classNames?.option);
        li.setAttribute('role', 'option');
        li.textContent = opt.label;
        if (opt.disabled) li.dataset.disabled = '';
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          toggleOption(opt);
        });
        liByValue.set(opt.value, li);
      }
      const isSel = selected.has(opt.value);
      li.setAttribute('aria-selected', isSel ? 'true' : 'false');
      if (isSel) li.dataset.selected = '';
      else delete li.dataset.selected;
      if (i === activeIdx) li.dataset.active = '';
      else delete li.dataset.active;
      const expected = prev ? prev.nextSibling : dropdown.firstChild;
      if (expected !== li) dropdown.insertBefore(li, expected);
      prev = li;
    });

    for (const [val, li] of liByValue) {
      if (!seen.has(val)) {
        li.remove();
        liByValue.delete(val);
      }
    }

    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const asyncController = fetcher
    ? createAsyncDataController<string | MultiSelectOption>(fetcher, {
        debounceMs,
        onLoading: (l) => {
          loading = l;
          renderDropdown();
        },
        onResult: (items) => {
          options = normalize(items);
          for (const opt of options) optionByValue.set(opt.value, opt);
          loading = false;
          renderDropdown();
          // Pills may reference values whose labels only just arrived.
          renderPills();
        },
      })
    : null;

  if (asyncController) onCleanup(() => asyncController.dispose());

  input.addEventListener('focus', () => {
    if (asyncController) asyncController.request(input.value);
    renderDropdown();
  });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('input', () => {
    activeIdx = -1;
    if (asyncController) {
      asyncController.request(input.value);
      // Clear stale results so the dropdown shows the loading row (or nothing)
      // until the fresh fetch lands.
      options = [];
    }
    renderDropdown();
  });
  input.addEventListener('keydown', (e) => {
    if (dropdown.hidden && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      if (asyncController) asyncController.request(input.value);
      renderDropdown();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!currentFiltered.length) return;
      activeIdx = (activeIdx + 1) % currentFiltered.length;
      renderDropdown();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!currentFiltered.length) return;
      activeIdx = (activeIdx - 1 + currentFiltered.length) % currentFiltered.length;
      renderDropdown();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && currentFiltered[activeIdx]) {
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
    clear.appendChild(createIcon(Close, { size: 10, strokeWidth: 1.5 }));
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
