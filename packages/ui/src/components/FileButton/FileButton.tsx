import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import type { FileButtonProps } from './FileButton.types';

export function FileButton(userProps: FileButtonProps): DocumentFragment {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as FileButtonProps;

  const children = props.children;
  const multiple = props.multiple;
  const onChange = props.onChange;
  const resetRef = props.resetRef;

  // Order matters: the user's `children(open)` call evaluates first,
  // consuming the next cursor slot for the trigger (via its own
  // JSX-compiled adoption). Then `adoptElement('input')` consumes the
  // next slot for the hidden input. Both are added to the returned
  // fragment; the caller's `_insert` flattens them back into the
  // parent's children list for either hydrate or fresh render.
  const frag = document.createDocumentFragment();

  // We need the trigger first so its adoption (inside the user-supplied
  // callback) runs before the input's. `open` is defined below as a
  // forward ref so we can assign it after the input exists.
  let openFn: () => void = () => {};
  const trigger = children(() => openFn());

  const input = adoptElement<HTMLInputElement>('input', (inp) => {
    inp.setAttribute('type', 'file');
    inp.style.display = 'none';
    if (multiple) inp.setAttribute('multiple', '');

    renderEffect(() => {
      const accept = props.accept;
      if (accept) inp.setAttribute('accept', accept);
      else inp.removeAttribute('accept');
    });
    renderEffect(() => {
      const capture = props.capture;
      if (capture) inp.setAttribute('capture', typeof capture === 'string' ? capture : '');
      else inp.removeAttribute('capture');
    });
    renderEffect(() => {
      const name = props.name;
      if (name) inp.setAttribute('name', name);
      else inp.removeAttribute('name');
    });
    renderEffect(() => {
      const form = props.form;
      if (form) inp.setAttribute('form', form);
      else inp.removeAttribute('form');
    });
    renderEffect(() => { inp.disabled = !!props.disabled; });

    inp.addEventListener('change', () => {
      const files = inp.files ? Array.from(inp.files) : [];
      if (files.length === 0) onChange(null);
      else if (multiple) onChange(files);
      else onChange(files[0]);
    });

    openFn = () => {
      if (!props.disabled) inp.click();
    };

    if (resetRef) {
      resetRef.current = () => {
        inp.value = '';
      };
    }
  });

  frag.appendChild(trigger);
  frag.appendChild(input);
  return frag;
}
