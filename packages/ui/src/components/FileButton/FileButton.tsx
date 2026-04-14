import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import type { FileButtonProps } from './FileButton.types';

export function FileButton(userProps: FileButtonProps): DocumentFragment {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as FileButtonProps;

  // `children`, `multiple`, `onChange`, `resetRef` are structural — decide
  // DOM shape, dispatch semantics, and imperative hooks.
  const children = props.children;
  const multiple = props.multiple;
  const onChange = props.onChange;
  const resetRef = props.resetRef;

  const input = document.createElement('input');
  input.type = 'file';
  input.style.display = 'none';
  if (multiple) input.multiple = true;

  renderEffect(() => {
    const accept = props.accept;
    if (accept) input.accept = accept;
    else input.removeAttribute('accept');
  });
  renderEffect(() => {
    const capture = props.capture;
    if (capture) input.setAttribute('capture', typeof capture === 'string' ? capture : '');
    else input.removeAttribute('capture');
  });
  renderEffect(() => {
    const name = props.name;
    if (name) input.name = name;
    else input.removeAttribute('name');
  });
  renderEffect(() => {
    const form = props.form;
    if (form) input.setAttribute('form', form);
    else input.removeAttribute('form');
  });
  renderEffect(() => { input.disabled = !!props.disabled; });

  input.addEventListener('change', () => {
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) {
      onChange(null);
    } else if (multiple) {
      onChange(files);
    } else {
      onChange(files[0]);
    }
  });

  const open = () => {
    if (!props.disabled) input.click();
  };

  if (resetRef) {
    resetRef.current = () => {
      input.value = '';
    };
  }

  const trigger = children(open);

  const frag = document.createDocumentFragment();
  frag.appendChild(trigger);
  frag.appendChild(input);
  return frag;
}
