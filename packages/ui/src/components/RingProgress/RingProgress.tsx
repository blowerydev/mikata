import { mergeClasses } from '../../utils/class-merge';
import type { RingProgressProps, RingProgressSection } from './RingProgress.types';
import './RingProgress.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

function resolveColor(c: string | undefined): string {
  if (!c) return 'var(--mkt-color-primary-6)';
  // If named palette color, map to CSS variable
  const named = ['primary','gray','red','green','blue','yellow','cyan','teal','violet','pink','orange'];
  if (named.includes(c)) return `var(--mkt-color-${c}-6)`;
  return c;
}

export function RingProgress(props: RingProgressProps = {}): HTMLElement {
  const {
    size = 120,
    thickness = 12,
    value,
    sections,
    color,
    rootColor,
    roundCaps,
    label,
    classNames,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-ring-progress', className, classNames?.root);
  root.style.width = `${size}px`;
  root.style.height = `${size}px`;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', mergeClasses('mkt-ring-progress__svg', classNames?.svg));

  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Background ring
  const bg = document.createElementNS(SVG_NS, 'circle');
  bg.setAttribute('cx', String(cx));
  bg.setAttribute('cy', String(cy));
  bg.setAttribute('r', String(radius));
  bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke', rootColor || 'var(--mkt-ring-root, var(--mkt-color-gray-2))');
  bg.setAttribute('stroke-width', String(thickness));
  svg.appendChild(bg);

  // Sections
  const segs: RingProgressSection[] =
    sections && sections.length
      ? sections
      : value != null
      ? [{ value, color: color as any }]
      : [];

  let offset = 0;
  for (const seg of segs) {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', resolveColor(seg.color as any));
    circle.setAttribute('stroke-width', String(thickness));
    const length = (seg.value / 100) * circumference;
    circle.setAttribute(
      'stroke-dasharray',
      `${length} ${circumference - length}`,
    );
    circle.setAttribute(
      'stroke-dashoffset',
      String(-offset),
    );
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

  if (label != null) {
    const labelEl = document.createElement('div');
    labelEl.className = mergeClasses('mkt-ring-progress__label', classNames?.label);
    if (label instanceof Node) labelEl.appendChild(label);
    else labelEl.textContent = label;
    root.appendChild(labelEl);
  }

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
