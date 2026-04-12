import type { FileButtonProps } from './FileButton.types';

export function FileButton(props: FileButtonProps): DocumentFragment {
  const { children, onChange, accept, multiple, capture, disabled, name, form, resetRef } = props;

  const input = document.createElement('input');
  input.type = 'file';
  input.style.display = 'none';
  if (accept) input.accept = accept;
  if (multiple) input.multiple = true;
  if (capture) input.setAttribute('capture', typeof capture === 'string' ? capture : '');
  if (name) input.name = name;
  if (form) input.setAttribute('form', form);
  if (disabled) input.disabled = true;

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
    if (!disabled) input.click();
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
