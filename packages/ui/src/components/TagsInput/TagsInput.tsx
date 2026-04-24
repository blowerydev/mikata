import { createIcon, Close } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { useUILabels } from '../../utils/use-i18n-optional';
import { InputWrapper } from '../_internal/InputWrapper';
import type { TagsInputProps } from './TagsInput.types';
import './TagsInput.css';

export function TagsInput(userProps: TagsInputProps): HTMLDivElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as TagsInputProps;

  const id = uniqueId('tags-input');
  const data = props.data;
  const listId = data ? `${id}-list` : undefined;
  const splitChars = props.splitChars ?? ['Enter', ','];
  const labels = useUILabels();

  const tags: string[] = [...(props.value ?? props.defaultValue ?? [])];

  // Refs captured from adoption callbacks so interaction handlers can
  // mutate the DOM without re-running setup.
  let inputEl!: HTMLInputElement;
  let pillsContainerEl!: HTMLDivElement;
  let dropdownEl: HTMLUListElement | undefined;
  let activeIdx = -1;
  let filtered: string[] = [];

  const emit = () => props.onChange?.(tags.slice());

  const removeTag = (i: number) => {
    tags.splice(i, 1);
    renderPills();
    emit();
  };

  const addTag = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (!props.allowDuplicates && tags.includes(v)) return;
    const maxTags = props.maxTags;
    if (maxTags != null && tags.length >= maxTags) return;
    tags.push(v);
    inputEl.value = '';
    renderPills();
    if (dropdownEl) renderDropdown();
    emit();
  };

  const renderPills = () => {
    // Rebuild from scratch: clears any SSR-rendered pills plus stale
    // client ones in one sweep.
    pillsContainerEl.replaceChildren();
    tags.forEach((t, i) => {
      const pill = document.createElement('span');
      pill.className = mergeClasses('mkt-tags-input__pill', props.classNames?.pill);
      pill.textContent = t;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = mergeClasses('mkt-tags-input__pill-remove', props.classNames?.pillRemove);
      rm.setAttribute('aria-label', `${labels.remove}: ${t}`);
      rm.appendChild(createIcon(Close, { size: 10, strokeWidth: 1.5 }));
      rm.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (props.disabled) return;
        removeTag(i);
      });
      pill.appendChild(rm);
      pillsContainerEl.appendChild(pill);
    });
  };

  const closeDropdown = () => {
    if (!dropdownEl) return;
    dropdownEl.hidden = true;
    inputEl.setAttribute('aria-expanded', 'false');
    activeIdx = -1;
  };

  const renderDropdown = () => {
    if (!dropdownEl || !data) return;
    const q = inputEl.value.trim().toLowerCase();
    filtered = data.filter((d) => {
      if (!props.allowDuplicates && tags.includes(d)) return false;
      return q ? d.toLowerCase().includes(q) : true;
    });
    dropdownEl.textContent = '';
    if (!filtered.length) {
      closeDropdown();
      return;
    }
    filtered.forEach((v, i) => {
      const li = document.createElement('li');
      li.className = 'mkt-tags-input__option';
      li.setAttribute('role', 'option');
      li.textContent = v;
      if (i === activeIdx) li.dataset.active = '';
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        addTag(v);
      });
      dropdownEl!.appendChild(li);
    });
    dropdownEl.hidden = false;
    inputEl.setAttribute('aria-expanded', 'true');
  };

  const buildWrapper = () =>
    adoptElement<HTMLDivElement>('div', (wrapper) => {
      wrapper.className = 'mkt-tags-input__root';

      adoptElement<HTMLDivElement>('div', (control) => {
        renderEffect(() => {
          control.className = mergeClasses('mkt-tags-input', props.classNames?.control);
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

        control.addEventListener('click', () => inputEl.focus());

        adoptElement<HTMLDivElement>('div', (pillsContainer) => {
          pillsContainerEl = pillsContainer;
          pillsContainer.className = 'mkt-tags-input__pills';
        });

        adoptElement<HTMLInputElement>('input', (input) => {
          inputEl = input;
          input.type = 'text';
          input.id = id;
          input.autocomplete = 'off';
          renderEffect(() => {
            input.className = mergeClasses('mkt-tags-input__input', props.classNames?.input);
          });
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
          if (listId) {
            input.setAttribute('role', 'combobox');
            input.setAttribute('aria-autocomplete', 'list');
            input.setAttribute('aria-expanded', 'false');
            input.setAttribute('aria-controls', listId);
          }

          input.addEventListener('keydown', (e) => {
            if (splitChars.includes(e.key)) {
              if (input.value.trim()) {
                e.preventDefault();
                if (dropdownEl && activeIdx >= 0) addTag(filtered[activeIdx]);
                else addTag(input.value);
              }
              return;
            }
            if (e.key === 'Backspace' && !input.value && tags.length > 0) {
              removeTag(tags.length - 1);
              return;
            }
            if (dropdownEl) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (dropdownEl.hidden) renderDropdown();
                else {
                  activeIdx = (activeIdx + 1) % filtered.length;
                  renderDropdown();
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIdx = (activeIdx - 1 + filtered.length) % filtered.length;
                renderDropdown();
              } else if (e.key === 'Escape') {
                closeDropdown();
              }
            }
          });

          if (data) {
            input.addEventListener('input', () => {
              activeIdx = -1;
              renderDropdown();
            });
            input.addEventListener('focus', renderDropdown);
            input.addEventListener('blur', () => setTimeout(closeDropdown, 120));
          }

          const ref = props.ref;
          if (ref) {
            if (typeof ref === 'function') ref(input as unknown as HTMLElement);
            else (ref as { current: HTMLInputElement | null }).current = input;
          }
        });
      });

      if (data) {
        adoptElement<HTMLUListElement>('ul', (dropdown) => {
          dropdownEl = dropdown;
          dropdown.id = listId!;
          dropdown.className = 'mkt-tags-input__dropdown';
          dropdown.setAttribute('role', 'listbox');
          dropdown.hidden = true;
        });
      }

      renderPills();
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
