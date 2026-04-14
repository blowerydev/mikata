import { createIcon, Close } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
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

export function FileInput(userProps: FileInputProps = {}): HTMLDivElement {
  const props = _mergeProps(userProps as Record<string, unknown>) as FileInputProps;

  const id = uniqueId('file-input');

  // `multiple` is read once — swapping single/multi at runtime changes the
  // callback shape, so re-mount instead.
  const multiple = !!props.multiple;
  // `valueComponent`, `leftSection` are read once — these are user-provided
  // rendering functions/nodes that don't need to re-evaluate on prop changes.
  const valueComponent = props.valueComponent;
  const leftSection = props.leftSection;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.className = 'mkt-file-input__native';
  fileInput.id = `${id}-native`;
  if (multiple) fileInput.multiple = true;
  renderEffect(() => {
    const a = props.accept;
    if (a) fileInput.accept = a;
    else fileInput.removeAttribute('accept');
  });
  renderEffect(() => {
    const c = props.capture;
    if (c) fileInput.setAttribute('capture', typeof c === 'string' ? c : '');
    else fileInput.removeAttribute('capture');
  });
  renderEffect(() => { fileInput.disabled = !!props.disabled; });

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = id;
  renderEffect(() => {
    trigger.className = mergeClasses('mkt-file-input__input', props.classNames?.input);
  });
  renderEffect(() => { trigger.dataset.size = props.size ?? 'md'; });
  renderEffect(() => { trigger.disabled = !!props.disabled; });
  renderEffect(() => {
    if (props.required) trigger.setAttribute('aria-required', 'true');
    else trigger.removeAttribute('aria-required');
  });
  renderEffect(() => {
    if (props.error) trigger.setAttribute('aria-invalid', 'true');
    else trigger.removeAttribute('aria-invalid');
  });

  const renderValue = (files: File | File[] | null | undefined) => {
    trigger.replaceChildren();

    if (leftSection) {
      const section = document.createElement('span');
      section.className = mergeClasses('mkt-file-input__section', props.classNames?.section);
      section.appendChild(leftSection.cloneNode(true));
      trigger.appendChild(section);
    }

    const text = document.createElement('span');
    text.className = 'mkt-file-input__value';

    if (!files || (Array.isArray(files) && files.length === 0)) {
      text.dataset.placeholder = '';
      text.textContent = props.placeholder ?? 'Select file';
    } else {
      const rendered = valueComponent ? valueComponent(files) : defaultFormat(files);
      if (rendered instanceof Node) text.appendChild(rendered);
      else text.textContent = rendered;
    }
    trigger.appendChild(text);

    if (props.clearable && files && !(Array.isArray(files) && files.length === 0)) {
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
        props.onChange?.(null);
      });
      trigger.appendChild(clear);
    }
  };

  let current: File | File[] | null | undefined = props.value;
  renderValue(current);

  trigger.addEventListener('click', () => {
    if (!props.disabled) fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const files = fileInput.files ? Array.from(fileInput.files) : [];
    let out: File | File[] | null;
    if (files.length === 0) out = null;
    else if (multiple) out = files;
    else out = files[0];
    current = out;
    renderValue(current);
    props.onChange?.(out);
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(trigger);
    else (ref as { current: HTMLElement | null }).current = trigger;
  }

  const wrapper = document.createElement('div');
  renderEffect(() => {
    wrapper.className = mergeClasses(
      'mkt-file-input',
      leftSection && 'mkt-file-input--has-left',
    );
  });
  wrapper.appendChild(fileInput);
  wrapper.appendChild(trigger);

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: wrapper,
  });
}
