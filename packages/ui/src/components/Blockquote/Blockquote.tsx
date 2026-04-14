import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { BlockquoteProps } from './Blockquote.types';
import './Blockquote.css';

export function Blockquote(props: BlockquoteProps = {}): HTMLElement {
  const el = document.createElement('blockquote');
  renderEffect(() => {
    el.className = mergeClasses('mkt-blockquote', props.class, props.classNames?.root);
  });
  renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });

  // Optional icon slot — toggles with prop presence.
  const iconWrap = document.createElement('span');
  renderEffect(() => {
    iconWrap.className = mergeClasses('mkt-blockquote__icon', props.classNames?.icon);
  });
  renderEffect(() => {
    iconWrap.replaceChildren();
    const icon = props.icon;
    if (icon) {
      iconWrap.appendChild(icon);
      if (!iconWrap.isConnected) el.insertBefore(iconWrap, el.firstChild);
    } else if (iconWrap.isConnected) {
      iconWrap.remove();
    }
  });

  const body = document.createElement('div');
  body.className = 'mkt-blockquote__body';
  renderEffect(() => {
    const c = props.children;
    if (c == null) body.textContent = '';
    else if (typeof c === 'string') body.textContent = c;
    else body.replaceChildren(c);
  });
  el.appendChild(body);

  // Optional cite slot.
  const citeEl = document.createElement('cite');
  renderEffect(() => {
    citeEl.className = mergeClasses('mkt-blockquote__cite', props.classNames?.cite);
  });
  renderEffect(() => {
    const cite = props.cite;
    if (cite == null) {
      if (citeEl.isConnected) citeEl.remove();
      return;
    }
    citeEl.replaceChildren();
    if (cite instanceof Node) citeEl.appendChild(cite);
    else citeEl.textContent = cite;
    if (!citeEl.isConnected) el.appendChild(citeEl);
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
