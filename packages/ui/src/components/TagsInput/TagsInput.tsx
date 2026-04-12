import { createIcon, Close } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { useUILabels } from '../../utils/use-i18n-optional';
import { InputWrapper } from '../_internal/InputWrapper';
import type { TagsInputProps } from './TagsInput.types';
import './TagsInput.css';

export function TagsInput(props: TagsInputProps): HTMLDivElement {
  const {
    value,
    defaultValue = [],
    placeholder,
    label,
    description,
    error,
    required,
    disabled,
    size = 'md',
    splitChars = ['Enter', ','],
    maxTags,
    allowDuplicates,
    data,
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('tags-input');
  const listId = data ? `${id}-list` : undefined;
  const labels = useUILabels();

  const tags: string[] = [...(value ?? defaultValue)];

  const control = document.createElement('div');
  control.className = mergeClasses('mkt-tags-input', classNames?.control);
  control.dataset.size = size;
  if (disabled) control.dataset.disabled = '';
  if (error) control.dataset.invalid = '';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.className = mergeClasses('mkt-tags-input__input', classNames?.input);
  input.autocomplete = 'off';
  if (placeholder) input.placeholder = placeholder;
  if (disabled) input.disabled = true;
  if (required) input.setAttribute('aria-required', 'true');
  if (error) input.setAttribute('aria-invalid', 'true');
  if (listId) {
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', listId);
  }

  const emit = () => onChange?.(tags.slice());

  const removeTag = (i: number) => {
    tags.splice(i, 1);
    renderPills();
    emit();
  };

  const addTag = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (!allowDuplicates && tags.includes(v)) return;
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
      pill.className = mergeClasses('mkt-tags-input__pill', classNames?.pill);
      pill.textContent = t;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = mergeClasses('mkt-tags-input__pill-remove', classNames?.pillRemove);
      rm.setAttribute('aria-label', `${labels.remove}: ${t}`);
      rm.appendChild(createIcon(Close, { size: 10, strokeWidth: 1.5 }));
      rm.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (disabled) return;
        removeTag(i);
      });
      pill.appendChild(rm);
      frag.appendChild(pill);
    });
    control.insertBefore(frag, input);
  };

  // Optional dropdown for suggestions
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
      if (!allowDuplicates && tags.includes(d)) return false;
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
