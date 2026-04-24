import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { BurgerProps } from './Burger.types';
import './Burger.css';

export function Burger(userProps: BurgerProps = {}): HTMLButtonElement {
  const props = _mergeProps(userProps as Record<string, unknown>) as BurgerProps;

  return adoptElement<HTMLButtonElement>('button', (btn) => {
    btn.setAttribute('type', 'button');
    renderEffect(() => {
      btn.className = mergeClasses('mkt-burger', props.class);
    });
    renderEffect(() => {
      const s = props.size ?? 'md';
      if (typeof s === 'string') {
        btn.dataset.size = s;
        btn.style.removeProperty('--_burger-size');
      } else {
        delete btn.dataset.size;
        btn.style.setProperty('--_burger-size', `${s}px`);
      }
    });
    renderEffect(() => {
      if (props.opened) btn.dataset.opened = '';
      else delete btn.dataset.opened;
    });
    renderEffect(() => { btn.disabled = !!props.disabled; });
    renderEffect(() => {
      const c = props.color;
      if (c) btn.style.setProperty('--_burger-color', `var(--mkt-color-${c}-6)`);
      else btn.style.removeProperty('--_burger-color');
    });
    renderEffect(() => { btn.setAttribute('aria-label', props.ariaLabel ?? 'Toggle menu'); });
    renderEffect(() => { btn.setAttribute('aria-expanded', props.opened ? 'true' : 'false'); });

    adoptElement<HTMLSpanElement>('span', (inner) => {
      inner.className = 'mkt-burger__inner';
    });

    const onClick = props.onClick;
    if (onClick) btn.addEventListener('click', (e) => onClick(e as MouseEvent));

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(btn);
      else (ref as { current: HTMLButtonElement | null }).current = btn;
    }
  });
}
