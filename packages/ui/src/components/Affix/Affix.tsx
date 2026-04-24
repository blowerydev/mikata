import { onCleanup, _mergeProps } from '@mikata/runtime';
import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { applyThemeToPortal } from '../../utils/get-color-scheme';
import type { AffixProps } from './Affix.types';
import './Affix.css';

function resolveCss(v: number | string | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

export function Affix(userProps: AffixProps = {}): Comment {
  const props = _mergeProps(userProps as Record<string, unknown>) as AffixProps;

  // Portaled element: attaches to document.body, no hydration adopt.
  // Doesn't go through `adoptElement` because there is no SSR-
  // rendered ancestor in the document's main tree to adopt from -
  // the component's visible slot in the SSR HTML is a comment.
  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-affix', props.class);
  });
  applyThemeToPortal(el);

  renderEffect(() => {
    const position = props.position ?? { bottom: 20, right: 20 };
    el.style.top = resolveCss(position.top) ?? '';
    el.style.right = resolveCss(position.right) ?? '';
    el.style.bottom = resolveCss(position.bottom) ?? '';
    el.style.left = resolveCss(position.left) ?? '';
  });
  renderEffect(() => {
    const z = props.zIndex;
    if (z != null) el.style.zIndex = String(z);
    else el.style.removeProperty('z-index');
  });

  // `children` content is structural — set once at setup.
  const children = props.children;
  if (children) {
    if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  document.body.appendChild(el);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  onCleanup(() => { el.remove(); });

  return document.createComment('mkt-affix');
}
