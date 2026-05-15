import { createIcon, Close } from '../../internal/icons';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { effect, getCurrentScope, onCleanup, renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { useUILabels } from '../../utils/use-i18n-optional';
import { createAsyncDataController } from '../../utils/async-data';
import { clampFloatingElement } from '../../utils/clamp-floating';
import { InputWrapper } from '../_internal/InputWrapper';
import type { MultiSelectProps, MultiSelectOption, MultiSelectFetcher } from './MultiSelect.types';
import './MultiSelect.css';

const normalize = (data: (string | MultiSelectOption)[]): MultiSelectOption[] =>
  data.map((d) => (typeof d === 'string' ? { value: d, label: d } : d));

export function MultiSelect(userProps: MultiSelectProps): HTMLDivElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as MultiSelectProps;

  const id = uniqueId('multi-select');
  const listId = `${id}-list`;
  const data = props.data;
  const isAsync = typeof data === 'function';
  const fetcher = isAsync ? (data as MultiSelectFetcher) : null;
  const debounceMs = props.debounceMs;
  const searchable = props.searchable ?? true;
  const clearable = props.clearable;
  let options: MultiSelectOption[] = isAsync ? [] : normalize(data as (string | MultiSelectOption)[]);
  const optionByValue = new Map<string, MultiSelectOption>();
  for (const opt of options) optionByValue.set(opt.value, opt);
  const labels = useUILabels();
  const resolvedLoadingLabel = props.loadingLabel ?? labels.loading ?? 'Loading…';

  const selected = new Set<string>(props.value ?? props.defaultValue ?? []);

  // Refs captured from adoption callbacks so the interaction handlers
  // (renderPills, renderDropdown, ...) can mutate the DOM without
  // re-running setup. Pills and <li> options are dynamic client-only
  // content that gets rebuilt inside the adopted containers.
  let inputEl!: HTMLInputElement;
  let pillsContainerEl!: HTMLDivElement;
  let dropdownEl!: HTMLUListElement;
  let activeIdx = -1;
  let currentFiltered: MultiSelectOption[] = [];
  let loading = false;
  let disposeClamp: (() => void) | undefined;
  const liByValue = new Map<string, HTMLLIElement>();
  let emptyLi: HTMLLIElement | null = null;
  let loadingLi: HTMLLIElement | null = null;

  const emit = () => props.onChange?.(Array.from(selected));

  const labelFor = (v: string): string => optionByValue.get(v)?.label ?? v;

  const syncSelected = (next: string[]) => {
    selected.clear();
    for (const v of next) selected.add(v);
  };

  const selectedEquals = (next: string[]) => {
    if (selected.size !== next.length) return false;
    return next.every((v) => selected.has(v));
  };

  const removePill = (v: string) => {
    selected.delete(v);
    renderPills();
    renderDropdown();
    emit();
  };

  const renderPills = () => {
    // Rebuild from scratch: clears any SSR-rendered pills plus stale
    // client ones in one sweep.
    pillsContainerEl.replaceChildren();
    for (const v of selected) {
      const lbl = labelFor(v);
      const pill = document.createElement('span');
      pill.className = mergeClasses('mkt-multi-select__pill', props.classNames?.pill);
      pill.textContent = lbl;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = mergeClasses('mkt-multi-select__pill-remove', props.classNames?.pillRemove);
      rm.setAttribute('aria-label', `${labels.remove}: ${lbl}`);
      rm.dataset.value = v;
      rm.appendChild(createIcon(Close, { size: 10, strokeWidth: 1.5 }));
      pill.appendChild(rm);
      pillsContainerEl.appendChild(pill);
    }
  };

  const close = () => {
    dropdownEl.hidden = true;
    disposeClamp?.();
    disposeClamp = undefined;
    inputEl.setAttribute('aria-expanded', 'false');
    inputEl.removeAttribute('aria-activedescendant');
    activeIdx = -1;
  };

  const openDropdown = () => {
    dropdownEl.hidden = false;
    disposeClamp?.();
    disposeClamp = clampFloatingElement(dropdownEl);
  };

  const toggleOption = (opt: MultiSelectOption) => {
    if (opt.disabled) return;
    const maxValues = props.maxValues;
    if (selected.has(opt.value)) selected.delete(opt.value);
    else {
      if (maxValues != null && selected.size >= maxValues) return;
      selected.add(opt.value);
    }
    inputEl.value = '';
    renderPills();
    renderDropdown();
    emit();
  };

  const renderDropdown = () => {
    const q = inputEl.value.trim().toLowerCase();
    if (isAsync) {
      currentFiltered = options.slice();
    } else {
      currentFiltered = options.filter((o) => !q || o.label.toLowerCase().includes(q));
    }

    if (loading) {
      activeIdx = -1;
      inputEl.removeAttribute('aria-activedescendant');
      for (const li of liByValue.values()) li.remove();
      liByValue.clear();
      if (emptyLi && emptyLi.parentNode === dropdownEl) emptyLi.remove();
      if (!loadingLi) {
        loadingLi = document.createElement('li');
        loadingLi.className = mergeClasses('mkt-multi-select__loading', props.classNames?.loading);
        loadingLi.setAttribute('aria-live', 'polite');
        loadingLi.textContent = resolvedLoadingLabel;
      }
      if (loadingLi.parentNode !== dropdownEl) dropdownEl.appendChild(loadingLi);
      openDropdown();
      inputEl.setAttribute('aria-expanded', 'true');
      return;
    }

    if (loadingLi && loadingLi.parentNode === dropdownEl) loadingLi.remove();

    if (!currentFiltered.length) {
      activeIdx = -1;
      inputEl.removeAttribute('aria-activedescendant');
      for (const li of liByValue.values()) li.remove();
      liByValue.clear();
      if (!emptyLi) {
        emptyLi = document.createElement('li');
        emptyLi.className = 'mkt-multi-select__empty';
        emptyLi.textContent = labels.noResults;
      }
      if (emptyLi.parentNode !== dropdownEl) dropdownEl.appendChild(emptyLi);
      openDropdown();
      inputEl.setAttribute('aria-expanded', 'true');
      return;
    }

    if (emptyLi && emptyLi.parentNode === dropdownEl) emptyLi.remove();

    const seen = new Set<string>();
    let prev: HTMLLIElement | null = null;
    currentFiltered.forEach((opt, i) => {
      seen.add(opt.value);
      let li = liByValue.get(opt.value);
      if (!li) {
        li = document.createElement('li');
        li.className = mergeClasses('mkt-multi-select__option', props.classNames?.option);
        li.setAttribute('role', 'option');
        li.textContent = opt.label;
        liByValue.set(opt.value, li);
      }
      li.dataset.value = opt.value;
      if (opt.disabled) li.dataset.disabled = '';
      else delete li.dataset.disabled;
      const isSel = selected.has(opt.value);
      li.id = `${id}-opt-${i}`;
      li.setAttribute('aria-selected', isSel ? 'true' : 'false');
      if (isSel) li.dataset.selected = '';
      else delete li.dataset.selected;
      if (i === activeIdx) li.dataset.active = '';
      else delete li.dataset.active;
      const expected = prev ? prev.nextSibling : dropdownEl.firstChild;
      if (expected !== li) dropdownEl.insertBefore(li, expected);
      prev = li;
    });

    for (const [val, li] of liByValue) {
      if (!seen.has(val)) {
        li.remove();
        liByValue.delete(val);
      }
    }

    openDropdown();
    inputEl.setAttribute('aria-expanded', 'true');
    if (activeIdx >= 0 && currentFiltered[activeIdx]) {
      inputEl.setAttribute('aria-activedescendant', `${id}-opt-${activeIdx}`);
    } else {
      inputEl.removeAttribute('aria-activedescendant');
    }
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
          renderPills();
        },
      })
    : null;

  if (asyncController && getCurrentScope()) onCleanup(() => asyncController.dispose());
  if (getCurrentScope()) onCleanup(() => disposeClamp?.());

  const buildWrapper = () =>
    adoptElement<HTMLDivElement>('div', (wrapper) => {
      wrapper.className = 'mkt-multi-select__root';

      adoptElement<HTMLDivElement>('div', (control) => {
        renderEffect(() => {
          control.className = mergeClasses('mkt-multi-select', props.classNames?.control);
        });
        renderEffect(() => { control.dataset.size = props.size ?? 'md'; });
        renderEffect(() => {
          if (props.disabled) control.dataset.disabled = '';
          else delete control.dataset.disabled;
        });
        renderEffect(() => {
          if (props.error) control.dataset.invalid = '';
          else delete control.dataset.invalid;
        });

        control.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.mkt-multi-select__pill-remove')) return;
          inputEl.focus();
        });

        adoptElement<HTMLDivElement>('div', (pillsContainer) => {
          pillsContainerEl = pillsContainer;
          pillsContainer.className = 'mkt-multi-select__pills';
          const handlePillMouseDown = (e: MouseEvent) => {
            const target = e.target instanceof Element
              ? e.target.closest<HTMLButtonElement>('.mkt-multi-select__pill-remove')
              : null;
            if (!target || !pillsContainer.contains(target)) return;
            e.preventDefault();
            if (props.disabled) return;
            const value = target.dataset.value;
            if (value != null) removePill(value);
          };
          pillsContainer.addEventListener('mousedown', handlePillMouseDown);
          if (getCurrentScope()) {
            onCleanup(() => pillsContainer.removeEventListener('mousedown', handlePillMouseDown));
          }
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
          input.setAttribute('aria-multiselectable', 'true');
          renderEffect(() => {
            input.className = mergeClasses('mkt-multi-select__input', props.classNames?.input);
          });
          renderEffect(() => {
            const p = props.placeholder;
            if (p) input.placeholder = p;
            else input.removeAttribute('placeholder');
          });
          renderEffect(() => { input.disabled = !!props.disabled; });
          if (!searchable) input.readOnly = true;
          renderEffect(() => {
            if (props.required) input.setAttribute('aria-required', 'true');
            else input.removeAttribute('aria-required');
          });
          renderEffect(() => {
            if (props.error) input.setAttribute('aria-invalid', 'true');
            else input.removeAttribute('aria-invalid');
          });
          renderEffect(() => {
            const parts: string[] = [];
            if (props.description) parts.push(`${id}-description`);
            if (props.error) parts.push(`${id}-error`);
            if (parts.length) input.setAttribute('aria-describedby', parts.join(' '));
            else input.removeAttribute('aria-describedby');
          });

          input.addEventListener('focus', () => {
            if (asyncController) asyncController.request(input.value);
            renderDropdown();
          });
          input.addEventListener('blur', () => setTimeout(close, 120));
          input.addEventListener('input', () => {
            activeIdx = -1;
            if (asyncController) {
              asyncController.request(input.value);
              options = [];
            }
            renderDropdown();
          });
          input.addEventListener('keydown', (e) => {
            if (dropdownEl.hidden && (e.key === 'ArrowDown' || e.key === 'Enter')) {
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
              const last = Array.from(selected).pop();
              if (last) removePill(last);
            }
          });

          const ref = props.ref;
          if (ref) {
            if (typeof ref === 'function') ref(input as unknown as HTMLElement);
            else (ref as { current: HTMLInputElement | null }).current = input;
          }
        });

        if (clearable) {
          adoptElement<HTMLButtonElement>('button', (clear) => {
            clear.type = 'button';
            clear.className = 'mkt-multi-select__clear';
            clear.setAttribute('aria-label', labels.clear);
            renderEffect(() => { clear.disabled = !!props.disabled; });
            if (!clear.firstChild) clear.appendChild(createIcon(Close, { size: 10, strokeWidth: 1.5 }));
            clear.addEventListener('mousedown', (e) => {
              e.preventDefault();
              if (props.disabled) return;
              selected.clear();
              renderPills();
              renderDropdown();
              emit();
            });
          });
        }
      });

      adoptElement<HTMLUListElement>('ul', (dropdown) => {
        dropdownEl = dropdown;
        dropdown.id = listId;
        renderEffect(() => {
          dropdown.className = mergeClasses('mkt-multi-select__dropdown', props.classNames?.dropdown);
        });
        dropdown.setAttribute('role', 'listbox');
        dropdown.hidden = true;
        const handleOptionMouseDown = (e: MouseEvent) => {
          const target = e.target instanceof Element
            ? e.target.closest<HTMLLIElement>('.mkt-multi-select__option')
            : null;
          if (!target || !dropdown.contains(target)) return;
          e.preventDefault();
          const value = target.dataset.value;
          const opt = value == null ? undefined : optionByValue.get(value);
          if (opt) toggleOption(opt);
        };
        dropdown.addEventListener('mousedown', handleOptionMouseDown);
        if (getCurrentScope()) {
          onCleanup(() => dropdown.removeEventListener('mousedown', handleOptionMouseDown));
        }
      });

      renderPills();

      effect(() => {
        const controlled = props.value;
        if (controlled === undefined || selectedEquals(controlled)) return;
        syncSelected(controlled);
        renderPills();
        renderDropdown();
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
    children: buildWrapper,
  });
}
