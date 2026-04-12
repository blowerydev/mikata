import { mergeClasses } from '../../utils/class-merge';
import { Loader } from '../Loader';
import type { LoadingOverlayProps } from './LoadingOverlay.types';
import './LoadingOverlay.css';

export function LoadingOverlay(props: LoadingOverlayProps = {}): HTMLElement {
  const {
    visible = true,
    zIndex,
    overlayBlur,
    loaderProps,
    classNames,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-loading-overlay', className, classNames?.root);
  root.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (!visible) root.dataset.hidden = '';
  if (zIndex != null) root.style.zIndex = String(zIndex);

  const overlay = document.createElement('div');
  overlay.className = mergeClasses('mkt-loading-overlay__overlay', classNames?.overlay);
  if (overlayBlur != null) overlay.style.backdropFilter = `blur(${overlayBlur}px)`;
  root.appendChild(overlay);

  const loaderWrap = document.createElement('div');
  loaderWrap.className = mergeClasses('mkt-loading-overlay__loader', classNames?.loader);
  loaderWrap.appendChild(Loader(loaderProps || { size: 'md' }));
  root.appendChild(loaderWrap);

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
