import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { ImageProps } from './Image.types';
import './Image.css';

export function Image(userProps: ImageProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ImageProps;

  // `src`, `fallback` are structural — decide which child (img or fallback)
  // exists.
  const src = props.src;
  const fallback = props.fallback;

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-image', props.class, props.classNames?.root);
  });

  renderEffect(() => {
    const width = props.width;
    if (width == null) root.style.width = '';
    else root.style.width = typeof width === 'number' ? `${width}px` : width;
  });
  renderEffect(() => {
    const height = props.height;
    if (height == null) root.style.height = '';
    else root.style.height = typeof height === 'number' ? `${height}px` : height;
  });

  renderEffect(() => {
    const radius = props.radius;
    if (radius == null) {
      root.style.borderRadius = '';
      delete root.dataset.radius;
    } else if (typeof radius === 'number') {
      root.style.borderRadius = `${radius}px`;
      delete root.dataset.radius;
    } else {
      root.style.borderRadius = '';
      root.dataset.radius = radius;
    }
  });

  const renderFallback = () => {
    root.dataset.failed = '';
    if (fallback) {
      const wrap = document.createElement('div');
      renderEffect(() => {
        wrap.className = mergeClasses('mkt-image__fallback', props.classNames?.fallback);
      });
      wrap.appendChild(fallback);
      root.replaceChildren(wrap);
    } else {
      root.replaceChildren();
    }
  };

  if (src) {
    const img = document.createElement('img');
    renderEffect(() => {
      img.className = mergeClasses('mkt-image__image', props.classNames?.image);
    });
    img.src = src;
    img.alt = props.alt ?? '';
    renderEffect(() => { img.style.objectFit = props.fit ?? 'cover'; });
    img.addEventListener('error', renderFallback);
    root.appendChild(img);
  } else {
    renderFallback();
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
