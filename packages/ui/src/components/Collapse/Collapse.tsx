import { effect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { CollapseProps } from './Collapse.types';
import './Collapse.css';

export function Collapse(userProps: CollapseProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as CollapseProps;

  // `children`, `duration`, `timing`, `onTransitionEnd` are structural —
  // applied once at setup. `in` is read each tick via the effect below.
  const children = props.children;
  const duration = props.duration ?? 200;
  const timing = props.timing;
  const onTransitionEnd = props.onTransitionEnd;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-collapse', props.class);
  root.style.setProperty('--_collapse-duration', `${duration}ms`);
  if (timing) root.style.transitionTimingFunction = timing;
  root.style.overflow = 'hidden';
  root.style.transitionProperty = 'height';
  root.style.transitionDuration = `${duration}ms`;

  const inner = document.createElement('div');
  inner.appendChild(children);
  root.appendChild(inner);

  const readOpen = (): boolean => {
    const v = props.in;
    return typeof v === 'function' ? (v as () => boolean)() : Boolean(v);
  };

  const initialOpen = readOpen();
  root.style.height = initialOpen ? 'auto' : '0px';
  root.setAttribute('aria-hidden', initialOpen ? 'false' : 'true');

  let first = true;
  effect(() => {
    const o = readOpen();
    if (first) {
      first = false;
      return;
    }
    animate(o);
  });

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
        root.style.height = '0px';
        requestAnimationFrame(() => {
          root.style.height = `${h}px`;
          root.addEventListener('transitionend', handle);
        });
      });
    } else {
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

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
