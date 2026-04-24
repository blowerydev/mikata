import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { ImageProps } from './Image.types';
import './Image.css';

export function Image(userProps: ImageProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ImageProps;

  const src = props.src;
  const fallback = props.fallback;

  return adoptElement<HTMLElement>('div', (root) => {
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

    // Fallback swap-in is a post-load mutation; the adoption invariant
    // only needs to hold through initial hydration, so freely replace
    // children when the image fails.
    const renderFallback = () => {
      root.dataset.failed = '';
      if (fallback) {
        const wrap = document.createElement('div');
        wrap.className = mergeClasses('mkt-image__fallback', props.classNames?.fallback);
        wrap.appendChild(fallback);
        root.replaceChildren(wrap);
      } else {
        root.replaceChildren();
      }
    };

    if (src) {
      adoptElement<HTMLImageElement>('img', (img) => {
        renderEffect(() => {
          img.className = mergeClasses('mkt-image__image', props.classNames?.image);
        });
        img.setAttribute('src', src);
        img.setAttribute('alt', props.alt ?? '');
        renderEffect(() => { img.style.objectFit = props.fit ?? 'cover'; });
        img.addEventListener('error', renderFallback);
      });
    } else if (fallback) {
      adoptElement<HTMLDivElement>('div', (wrap) => {
        renderEffect(() => {
          wrap.className = mergeClasses('mkt-image__fallback', props.classNames?.fallback);
        });
        if (!wrap.firstChild) wrap.appendChild(fallback);
      });
      root.dataset.failed = '';
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
