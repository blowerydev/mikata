import { onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { createAsyncDataController } from '../../utils/async-data';
import { InputWrapper } from '../_internal/InputWrapper';
import type { AutocompleteProps, AutocompleteFetcher } from './Autocomplete.types';
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
    debounceMs,
    loadingLabel = 'Loading…',
    onChange,
    onOptionSubmit,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('autocomplete');
  const listId = `${id}-list`;
  const isAsync = typeof data === 'function';
  const fetcher = isAsync ? (data as AutocompleteFetcher) : null;

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
  let remoteItems: string[] = [];
  let loading = false;
  // Keyed reconciliation - reuse <li> nodes by option value so fast typing
  // doesn't blow away and recreate the entire dropdown on every keystroke.
  const liByOption = new Map<string, HTMLLIElement>();
  let loadingLi: HTMLLIElement | null = null;

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

  const ensureLoadingLi = () => {
    if (!loadingLi) {
      loadingLi = document.createElement('li');
      loadingLi.className = mergeClasses('mkt-autocomplete__loading', classNames?.loading);
      loadingLi.setAttribute('aria-live', 'polite');
      loadingLi.textContent = loadingLabel;
    }
    return loadingLi;
  };

  const render = () => {
    const q = input.value.trim();
    const qLower = q.toLowerCase();

    if (isAsync) {
      current = remoteItems.slice(0, limit);
    } else {
      const arr = data as string[];
      current = (q ? arr.filter((d) => d.toLowerCase().includes(qLower)) : arr).slice(0, limit);
    }

    const nothingToShow = !current.length && !loading;
    if (nothingToShow) {
      for (const li of liByOption.values()) li.remove();
      liByOption.clear();
      if (loadingLi && loadingLi.parentNode === dropdown) loadingLi.remove();
      close();
      return;
    }

    if (loading && !current.length) {
      for (const li of liByOption.values()) li.remove();
      liByOption.clear();
      const l = ensureLoadingLi();
      if (l.parentNode !== dropdown) dropdown.appendChild(l);
      dropdown.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    if (loadingLi && loadingLi.parentNode === dropdown) loadingLi.remove();

    const seen = new Set<string>();
    let prev: HTMLLIElement | null = null;
    current.forEach((opt, i) => {
      seen.add(opt);
      let li = liByOption.get(opt);
      if (!li) {
        li = document.createElement('li');
        li.className = mergeClasses('mkt-autocomplete__option', classNames?.option);
        li.setAttribute('role', 'option');
        li.textContent = opt;
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          commit(opt);
        });
        liByOption.set(opt, li);
      }
      li.id = `${id}-opt-${i}`;
      if (i === activeIdx) li.dataset.active = '';
      else delete li.dataset.active;
      const expected = prev ? prev.nextSibling : dropdown.firstChild;
      if (expected !== li) dropdown.insertBefore(li, expected);
      prev = li;
    });

    for (const [opt, li] of liByOption) {
      if (!seen.has(opt)) {
        li.remove();
        liByOption.delete(opt);
      }
    }

    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const asyncController = fetcher
    ? createAsyncDataController<string>(fetcher, {
        debounceMs,
        onLoading: (l) => {
          loading = l;
          render();
        },
        onResult: (items) => {
          remoteItems = items;
          loading = false;
          render();
        },
      })
    : null;

  if (asyncController) onCleanup(() => asyncController.dispose());

  input.addEventListener('input', () => {
    onChange?.(input.value);
    activeIdx = -1;
    if (asyncController) {
      asyncController.request(input.value);
      // Clear any prior results immediately so stale options don't linger
      // while the debounce + fetch runs.
      remoteItems = [];
    }
    render();
  });

  input.addEventListener('focus', () => {
    if (asyncController) asyncController.request(input.value);
    render();
  });
  input.addEventListener('blur', () => setTimeout(close, 120));

  input.addEventListener('keydown', (e) => {
    if (dropdown.hidden) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (asyncController) asyncController.request(input.value);
        render();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!current.length) return;
      activeIdx = (activeIdx + 1) % current.length;
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!current.length) return;
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
