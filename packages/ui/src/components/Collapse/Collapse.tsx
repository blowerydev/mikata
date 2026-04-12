import { effect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { CollapseProps } from './Collapse.types';
import './Collapse.css';

export function Collapse(props: CollapseProps): HTMLElement {
  const {
    in: open,
    duration = 200,
    timing,
    onTransitionEnd,
    children,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-collapse', className);
  root.style.setProperty('--_collapse-duration', `${duration}ms`);
  if (timing) root.style.transitionTimingFunction = timing;
  root.style.overflow = 'hidden';
  root.style.transitionProperty = 'height';
  root.style.transitionDuration = `${duration}ms`;

  const inner = document.createElement('div');
  inner.appendChild(children);
  root.appendChild(inner);

  const isReactive = typeof open === 'function';
  const getOpen = () => (isReactive ? (open as unknown as () => boolean)() : Boolean(open));

  // Initial
  const initialOpen = getOpen();
  root.style.height = initialOpen ? 'auto' : '0px';
  root.setAttribute('aria-hidden', initialOpen ? 'false' : 'true');

  if (isReactive) {
    let first = true;
    effect(() => {
      const o = getOpen();
      if (first) {
        first = false;
        return;
      }
      animate(o);
    });
  }

  function animate(o: boolean) {
    root.setAttribute('aria-hidden', o ? 'false' : 'true');
    const h = inner.offsetHeight;
    if (o) {
      root.style.height = `${h}px`;
      const handle = () => {
        root.style.height = 'auto';
        root.removeEventListener('transitionend', handle);
        onTransitionEnd?.();
      };
      requestAnimationFrame(() => {
        // Start animation
        root.style.height = '0px';
        requestAnimationFrame(() => {
          root.style.height = `${h}px`;
          root.addEventListener('transitionend', handle);
        });
      });
    } else {
      // Collapse: fix to current pixel then animate to 0
      root.style.height = `${h}px`;
      requestAnimationFrame(() => {
        root.style.height = '0px';
        const handle = () => {
          root.removeEventListener('transitionend', handle);
          onTransitionEnd?.();
        };
        root.addEventListener('transitionend', handle);
      });
    }
  }

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
