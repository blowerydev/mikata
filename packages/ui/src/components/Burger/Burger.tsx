import { mergeClasses } from '../../utils/class-merge';
import type { BurgerProps } from './Burger.types';
import './Burger.css';

export function Burger(props: BurgerProps = {}): HTMLButtonElement {
  const { opened, onClick, size = 'md', color, disabled, ariaLabel = 'Toggle menu', class: className, ref } = props;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = mergeClasses('mkt-burger', className);
  if (typeof size === 'string') btn.dataset.size = size;
  else btn.style.setProperty('--_burger-size', `${size}px`);
  if (opened) btn.dataset.opened = '';
  if (disabled) btn.disabled = true;
  if (color) btn.style.setProperty('--_burger-color', `var(--mkt-color-${color}-6)`);
  btn.setAttribute('aria-label', ariaLabel);
  btn.setAttribute('aria-expanded', opened ? 'true' : 'false');

  const inner = document.createElement('span');
  inner.className = 'mkt-burger__inner';
  btn.appendChild(inner);

  if (onClick) btn.addEventListener('click', (e) => onClick(e as MouseEvent));

  if (ref) {
    if (typeof ref === 'function') ref(btn);
    else (ref as any).current = btn;
  }
  return btn;
}
