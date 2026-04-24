import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { Loader } from '../Loader';
import type { LoadingOverlayProps } from './LoadingOverlay.types';
import './LoadingOverlay.css';

export function LoadingOverlay(userProps: LoadingOverlayProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as LoadingOverlayProps;

  const loaderProps = props.loaderProps;

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-loading-overlay', props.class, props.classNames?.root);
    });
    renderEffect(() => {
      const visible = props.visible ?? true;
      root.setAttribute('aria-hidden', visible ? 'false' : 'true');
      if (!visible) root.dataset.hidden = '';
      else delete root.dataset.hidden;
    });
    renderEffect(() => {
      const z = props.zIndex;
      if (z != null) root.style.zIndex = String(z);
      else root.style.zIndex = '';
    });

    adoptElement<HTMLDivElement>('div', (overlay) => {
      renderEffect(() => {
        overlay.className = mergeClasses('mkt-loading-overlay__overlay', props.classNames?.overlay);
      });
      renderEffect(() => {
        const b = props.overlayBlur;
        if (b != null) overlay.style.backdropFilter = `blur(${b}px)`;
        else overlay.style.backdropFilter = '';
      });
    });

    adoptElement<HTMLDivElement>('div', (loaderWrap) => {
      renderEffect(() => {
        loaderWrap.className = mergeClasses('mkt-loading-overlay__loader', props.classNames?.loader);
      });
      if (!loaderWrap.firstChild) {
        loaderWrap.appendChild(Loader(loaderProps || { size: 'md' }));
      }
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
