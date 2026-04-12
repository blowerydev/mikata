import { onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { applyThemeToPortal } from '../../utils/get-color-scheme';
import type { AffixProps } from './Affix.types';
import './Affix.css';

function resolveCss(v: number | string | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

export function Affix(props: AffixProps = {}): Comment {
  const { position = { bottom: 20, right: 20 }, zIndex, children, class: className, ref } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-affix', className);
  applyThemeToPortal(el);

  const top = resolveCss(position.top);
  const right = resolveCss(position.right);
  const bottom = resolveCss(position.bottom);
  const left = resolveCss(position.left);
  if (top != null) el.style.top = top;
  if (right != null) el.style.right = right;
  if (bottom != null) el.style.bottom = bottom;
  if (left != null) el.style.left = left;

  if (zIndex != null) el.style.zIndex = String(zIndex);

  if (children) {
    if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  document.body.appendChild(el);

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  onCleanup(() => {
    el.remove();
  });

  return document.createComment('mkt-affix');
}
