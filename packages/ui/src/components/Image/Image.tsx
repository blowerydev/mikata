import { mergeClasses } from '../../utils/class-merge';
import type { ImageProps } from './Image.types';
import './Image.css';

export function Image(props: ImageProps = {}): HTMLElement {
  const {
    src,
    alt = '',
    width,
    height,
    fit = 'cover',
    radius,
    fallback,
    classNames,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-image', className, classNames?.root);

  if (width != null) root.style.width = typeof width === 'number' ? `${width}px` : width;
  if (height != null) root.style.height = typeof height === 'number' ? `${height}px` : height;

  if (radius != null) {
    if (typeof radius === 'number') root.style.borderRadius = `${radius}px`;
    else root.dataset.radius = radius;
  }

  const renderFallback = () => {
    root.dataset.failed = '';
    if (fallback) {
      const wrap = document.createElement('div');
      wrap.className = mergeClasses('mkt-image__fallback', classNames?.fallback);
      wrap.appendChild(fallback);
      root.replaceChildren(wrap);
    } else {
      root.replaceChildren();
    }
  };

  if (src) {
    const img = document.createElement('img');
    img.className = mergeClasses('mkt-image__image', classNames?.image);
    img.src = src;
    img.alt = alt;
    img.style.objectFit = fit;
    img.addEventListener('error', renderFallback);
    root.appendChild(img);
  } else {
    renderFallback();
  }

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
