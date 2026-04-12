import { createIcon, Close } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { FileInputProps } from './FileInput.types';
import './FileInput.css';

function defaultFormat(files: File | File[]): string {
  if (Array.isArray(files)) {
    if (files.length === 0) return '';
    if (files.length === 1) return files[0].name;
    return `${files.length} files`;
  }
  return files.name;
}

export function FileInput(props: FileInputProps = {}): HTMLDivElement {
  const {
    label,
    description,
    error,
    required,
    disabled,
    placeholder = 'Select file',
    size = 'md',
    accept,
    multiple,
    capture,
    value,
    onChange,
    clearable,
    valueComponent,
    leftSection,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('file-input');

  // Hidden native file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.className = 'mkt-file-input__native';
  fileInput.id = `${id}-native`;
  if (accept) fileInput.accept = accept;
  if (multiple) fileInput.multiple = true;
  if (capture) fileInput.setAttribute('capture', typeof capture === 'string' ? capture : '');
  if (disabled) fileInput.disabled = true;

  // Visible trigger button
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = id;
  trigger.className = mergeClasses('mkt-file-input__input', classNames?.input);
  trigger.dataset.size = size;
  if (disabled) trigger.disabled = true;
  if (required) trigger.setAttribute('aria-required', 'true');
  if (error) trigger.setAttribute('aria-invalid', 'true');

  const renderValue = (files: File | File[] | null | undefined) => {
    trigger.replaceChildren();

    if (leftSection) {
      const section = document.createElement('span');
      section.className = mergeClasses('mkt-file-input__section', classNames?.section);
      section.appendChild(leftSection.cloneNode(true));
      trigger.appendChild(section);
    }

    const text = document.createElement('span');
    text.className = 'mkt-file-input__value';

    if (!files || (Array.isArray(files) && files.length === 0)) {
      text.dataset.placeholder = '';
      text.textContent = placeholder;
    } else {
      const rendered = valueComponent ? valueComponent(files) : defaultFormat(files);
      if (rendered instanceof Node) text.appendChild(rendered);
      else text.textContent = rendered;
    }
    trigger.appendChild(text);

    if (clearable && files && !(Array.isArray(files) && files.length === 0)) {
      const clear = document.createElement('span');
      clear.className = 'mkt-file-input__clear';
      clear.setAttribute('role', 'button');
      clear.setAttribute('aria-label', 'Clear');
      clear.tabIndex = 0;
      clear.appendChild(createIcon(Close, { size: 12, strokeWidth: 1.5 }));
      clear.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        renderValue(null);
        onChange?.(null);
      });
      trigger.appendChild(clear);
    }
  };

  let current: File | File[] | null | undefined = value;
  renderValue(current);

  trigger.addEventListener('click', () => {
    if (!disabled) fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const files = fileInput.files ? Array.from(fileInput.files) : [];
    let out: File | File[] | null;
    if (files.length === 0) out = null;
    else if (multiple) out = files;
    else out = files[0];
    current = out;
    renderValue(current);
    onChange?.(out);
  });

  if (ref) {
    if (typeof ref === 'function') ref(trigger);
    else (ref as any).current = trigger;
  }

  const wrapper = document.createElement('div');
  wrapper.className = mergeClasses(
    'mkt-file-input',
    leftSection && 'mkt-file-input--has-left',
  );
  wrapper.appendChild(fileInput);
  wrapper.appendChild(trigger);

  return InputWrapper({
    id,
    label,
    description,
    error,
    required,
    size,
    class: className,
    classNames,
    children: wrapper,
  });
}
