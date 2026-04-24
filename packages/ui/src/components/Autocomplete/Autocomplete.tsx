import { onCleanup, _mergeProps, adoptElement } from '@mikata/runtime';
import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { createAsyncDataController } from '../../utils/async-data';
import { InputWrapper } from '../_internal/InputWrapper';
import type { AutocompleteProps, AutocompleteFetcher } from './Autocomplete.types';
import './Autocomplete.css';

export function Autocomplete(userProps: AutocompleteProps): HTMLDivElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as AutocompleteProps;

  const id = uniqueId('autocomplete');
  const listId = `${id}-list`;
  const data = props.data;
  const isAsync = typeof data === 'function';
  const fetcher = isAsync ? (data as AutocompleteFetcher) : null;
  const limit = props.limit ?? 8;
  const debounceMs = props.debounceMs;
  const loadingLabel = props.loadingLabel ?? 'Loading…';

  // Refs captured from the adoption callbacks so the interaction
  // handlers (render, commit, close, ...) can mutate the DOM without
  // re-running setup. The <li> options are dynamic client-only content
  // — they aren't part of SSR output, so we build them fresh.
  let inputEl!: HTMLInputElement;
  let dropdownEl!: HTMLUListElement;
  let activeIdx = -1;
  let current: string[] = [];
  let remoteItems: string[] = [];
  let loading = false;
  const liByOption = new Map<string, HTMLLIElement>();
  let loadingLi: HTMLLIElement | null = null;

  const close = () => {
    dropdownEl.hidden = true;
    inputEl.setAttribute('aria-expanded', 'false');
    activeIdx = -1;
  };

  const commit = (v: string) => {
    inputEl.value = v;
    props.onChange?.(v);
    props.onOptionSubmit?.(v);
    close();
  };

  const ensureLoadingLi = () => {
    if (!loadingLi) {
      loadingLi = document.createElement('li');
      loadingLi.className = mergeClasses('mkt-autocomplete__loading', props.classNames?.loading);
      loadingLi.setAttribute('aria-live', 'polite');
      loadingLi.textContent = loadingLabel;
    }
    return loadingLi;
  };

  const render = () => {
    const q = inputEl.value.trim();
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
      if (loadingLi && loadingLi.parentNode === dropdownEl) loadingLi.remove();
      close();
      return;
    }

    if (loading && !current.length) {
      for (const li of liByOption.values()) li.remove();
      liByOption.clear();
      const l = ensureLoadingLi();
      if (l.parentNode !== dropdownEl) dropdownEl.appendChild(l);
      dropdownEl.hidden = false;
      inputEl.setAttribute('aria-expanded', 'true');
      return;
    }

    if (loadingLi && loadingLi.parentNode === dropdownEl) loadingLi.remove();

    const seen = new Set<string>();
    let prev: HTMLLIElement | null = null;
    current.forEach((opt, i) => {
      seen.add(opt);
      let li = liByOption.get(opt);
      if (!li) {
        li = document.createElement('li');
        li.className = mergeClasses('mkt-autocomplete__option', props.classNames?.option);
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
      const expected = prev ? prev.nextSibling : dropdownEl.firstChild;
      if (expected !== li) dropdownEl.insertBefore(li, expected);
      prev = li;
    });

    for (const [opt, li] of liByOption) {
      if (!seen.has(opt)) {
        li.remove();
        liByOption.delete(opt);
      }
    }

    dropdownEl.hidden = false;
    inputEl.setAttribute('aria-expanded', 'true');
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

  const buildContainer = () =>
    adoptElement<HTMLDivElement>('div', (container) => {
      renderEffect(() => {
        container.className = mergeClasses('mkt-autocomplete', props.classNames?.root);
      });

      adoptElement<HTMLInputElement>('input', (input) => {
        inputEl = input;
        input.type = 'text';
        input.id = id;
        input.autocomplete = 'off';
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-controls', listId);
        renderEffect(() => {
          input.className = mergeClasses('mkt-autocomplete__input', props.classNames?.input);
        });
        renderEffect(() => { input.dataset.size = props.size ?? 'md'; });
        renderEffect(() => {
          const p = props.placeholder;
          if (p) input.placeholder = p;
          else input.removeAttribute('placeholder');
        });
        renderEffect(() => { input.disabled = !!props.disabled; });
        renderEffect(() => {
          if (props.required) input.setAttribute('aria-required', 'true');
          else input.removeAttribute('aria-required');
        });
        renderEffect(() => {
          if (props.error) input.setAttribute('aria-invalid', 'true');
          else input.removeAttribute('aria-invalid');
        });
        input.value = props.value ?? props.defaultValue ?? '';

        input.addEventListener('input', () => {
          props.onChange?.(input.value);
          activeIdx = -1;
          if (asyncController) {
            asyncController.request(input.value);
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
          if (dropdownEl.hidden) {
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

        const ref = props.ref;
        if (ref) {
          if (typeof ref === 'function') ref(input as unknown as HTMLElement);
          else (ref as { current: HTMLInputElement | null }).current = input;
        }
      });

      adoptElement<HTMLUListElement>('ul', (dropdown) => {
        dropdownEl = dropdown;
        dropdown.id = listId;
        renderEffect(() => {
          dropdown.className = mergeClasses('mkt-autocomplete__dropdown', props.classNames?.dropdown);
        });
        dropdown.setAttribute('role', 'listbox');
        dropdown.hidden = true;
      });
    });

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: buildContainer,
  });
}
