import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { RingProgressProps, RingProgressSection } from './RingProgress.types';
import './RingProgress.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

function resolveColor(c: string | undefined): string {
  if (!c) return 'var(--mkt-color-primary-6)';
  const named = ['primary','gray','red','green','blue','yellow','cyan','teal','violet','pink','orange'];
  if (named.includes(c)) return `var(--mkt-color-${c}-6)`;
  return c;
}

export function RingProgress(userProps: RingProgressProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as RingProgressProps;

  // Geometry (`size`, `thickness`), sections, value, and label are
  // structural - the SVG is built once; reactive values live in
  // class/background only. On hydration the SSR already produced the
  // SVG tree with the right shape, so skip rebuilding to preserve
  // node identity (and avoid re-parsing the SVG in-place).
  const size = props.size ?? 120;
  const thickness = props.thickness ?? 12;
  const value = props.value;
  const sections = props.sections;
  const color = props.color;
  const rootColor = props.rootColor;
  const roundCaps = props.roundCaps;
  const label = props.label;

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-ring-progress', props.class, props.classNames?.root);
    });
    root.style.width = `${size}px`;
    root.style.height = `${size}px`;

    // SVG subtree: svg elements can't be created via
    // `document.createElement`, so we can't route them through
    // `adoptElement`. Build fresh only when there's no pre-existing
    // svg - on hydration the SSR svg with every circle already lives
    // inside the adopted root.
    if (!root.querySelector('svg')) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
      renderEffect(() => {
        svg.setAttribute('class', mergeClasses('mkt-ring-progress__svg', props.classNames?.svg));
      });

      const radius = (size - thickness) / 2;
      const cx = size / 2;
      const cy = size / 2;
      const circumference = 2 * Math.PI * radius;

      const bg = document.createElementNS(SVG_NS, 'circle');
      bg.setAttribute('cx', String(cx));
      bg.setAttribute('cy', String(cy));
      bg.setAttribute('r', String(radius));
      bg.setAttribute('fill', 'none');
      bg.setAttribute('stroke', rootColor || 'var(--mkt-ring-root, var(--mkt-color-gray-2))');
      bg.setAttribute('stroke-width', String(thickness));
      svg.appendChild(bg);

      const segs: RingProgressSection[] =
        sections && sections.length
          ? sections
          : value != null
            ? [{ value, color: color as never }]
            : [];

      let offset = 0;
      for (const seg of segs) {
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', String(radius));
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', resolveColor(seg.color as never));
        circle.setAttribute('stroke-width', String(thickness));
        const length = (seg.value / 100) * circumference;
        circle.setAttribute('stroke-dasharray', `${length} ${circumference - length}`);
        circle.setAttribute('stroke-dashoffset', String(-offset));
        if (roundCaps) circle.setAttribute('stroke-linecap', 'round');
        circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
        if (seg.tooltip) {
          const title = document.createElementNS(SVG_NS, 'title');
          title.textContent = seg.tooltip;
          circle.appendChild(title);
        }
        svg.appendChild(circle);
        offset += length;
      }

      root.appendChild(svg);
    }

    if (label != null) {
      adoptElement<HTMLDivElement>('div', (labelEl) => {
        renderEffect(() => {
          labelEl.className = mergeClasses('mkt-ring-progress__label', props.classNames?.label);
        });
        renderEffect(() => {
          const l = props.label;
          if (l == null) labelEl.replaceChildren();
          else if (l instanceof Node) labelEl.replaceChildren(l);
          else labelEl.textContent = String(l);
        });
      });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
