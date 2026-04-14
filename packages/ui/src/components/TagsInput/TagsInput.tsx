import { createIcon, Close } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { useUILabels } from '../../utils/use-i18n-optional';
import { InputWrapper } from '../_internal/InputWrapper';
import type { TagsInputProps } from './TagsInput.types';
import './TagsInput.css';

export function TagsInput(userProps: TagsInputProps): HTMLDivElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as TagsInputProps;

  const id = uniqueId('tags-input');
  // `data` presence determines whether a suggestion dropdown exists at all —
  // read once at setup. `splitChars` captured once for the keydown listener.
  const data = props.data;
  const listId = data ? `${id}-list` : undefined;
  const splitChars = props.splitChars ?? ['Enter', ','];
  const labels = useUILabels();

  const tags: string[] = [...(props.value ?? props.defaultValue ?? [])];

  const control = document.createElement('div');
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

  const input = document.createElement('input');
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
    input.value = '';
    renderPills();
    if (listId) renderDropdown();
    emit();
  };

  const renderPills = () => {
    Array.from(control.querySelectorAll('.mkt-tags-input__pill')).forEach((el) => el.remove());
    const frag = document.createDocumentFragment();
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
      frag.appendChild(pill);
    });
    control.insertBefore(frag, input);
  };

  let dropdown: HTMLUListElement | undefined;
  let activeIdx = -1;
  let filtered: string[] = [];

  if (data) {
    dropdown = document.createElement('ul');
    dropdown.id = listId!;
    dropdown.className = 'mkt-tags-input__dropdown';
    dropdown.setAttribute('role', 'listbox');
    dropdown.hidden = true;
  }

  const closeDropdown = () => {
    if (!dropdown) return;
    dropdown.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    activeIdx = -1;
  };

  const renderDropdown = () => {
    if (!dropdown || !data) return;
    const q = input.value.trim().toLowerCase();
    filtered = data.filter((d) => {
      if (!props.allowDuplicates && tags.includes(d)) return false;
      return q ? d.toLowerCase().includes(q) : true;
    });
    dropdown.textContent = '';
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
      dropdown!.appendChild(li);
    });
    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('keydown', (e) => {
    if (splitChars.includes(e.key)) {
      if (input.value.trim()) {
        e.preventDefault();
        if (dropdown && activeIdx >= 0) addTag(filtered[activeIdx]);
        else addTag(input.value);
      }
      return;
    }
    if (e.key === 'Backspace' && !input.value && tags.length > 0) {
      removeTag(tags.length - 1);
      return;
    }
    if (dropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (dropdown.hidden) renderDropdown();
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

  if (dropdown) {
    input.addEventListener('input', () => {
      activeIdx = -1;
      renderDropdown();
    });
    input.addEventListener('focus', renderDropdown);
    input.addEventListener('blur', () => setTimeout(closeDropdown, 120));
  }

  control.addEventListener('click', () => input.focus());

  control.appendChild(input);

  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-tags-input__root';
  wrapper.appendChild(control);
  if (dropdown) wrapper.appendChild(dropdown);

  renderPills();

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(input as unknown as HTMLElement);
    else (ref as { current: HTMLInputElement | null }).current = input;
  }

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: wrapper,
  });
}
