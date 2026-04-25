const SVG_NS = 'http://www.w3.org/2000/svg';

export type IconAttrs = Record<string, string | number>;
export type IconChild = [string, IconAttrs];
export type IconNode = [string, IconAttrs, IconChild[]];
export type ReadonlyIconNode = readonly [
  string,
  Readonly<IconAttrs>,
  ReadonlyArray<readonly [string, Readonly<IconAttrs>]>?,
];

export interface IconProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  class?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

const defaultAttrs = {
  xmlns: SVG_NS,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const;

const icon = (...children: IconChild[]): IconNode => ['svg', { ...defaultAttrs }, children];

export const Check: IconNode = icon(['path', { d: 'M20 6 9 17l-5-5' }]);
export const ChevronDown: IconNode = icon(['path', { d: 'm6 9 6 6 6-6' }]);
export const ChevronLeft: IconNode = icon(['path', { d: 'm15 18-6-6 6-6' }]);
export const ChevronRight: IconNode = icon(['path', { d: 'm9 18 6-6-6-6' }]);
export const Close: IconNode = icon(
  ['path', { d: 'M18 6 6 18' }],
  ['path', { d: 'm6 6 12 12' }]
);
export const Eye: IconNode = icon(
  ['path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' }],
  ['circle', { cx: 12, cy: 12, r: 3 }]
);
export const EyeOff: IconNode = icon(
  ['path', { d: 'M9.88 9.88a3 3 0 1 0 4.24 4.24' }],
  ['path', { d: 'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' }],
  ['path', { d: 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61' }],
  ['line', { x1: 2, x2: 22, y1: 2, y2: 22 }]
);

export function createIcon(
  node: IconNode | ReadonlyIconNode,
  props: IconProps = {}
): SVGSVGElement {
  const [rootTag, rootAttrs, children = []] = node;
  const svg = document.createElementNS(SVG_NS, rootTag) as SVGSVGElement;

  for (const key in rootAttrs) {
    svg.setAttribute(key, String(rootAttrs[key]));
  }

  const size = props.size ?? 24;
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  if (props.color) svg.setAttribute('stroke', props.color);
  if (props.strokeWidth != null) {
    svg.setAttribute('stroke-width', String(props.strokeWidth));
  }
  if (props.class) svg.setAttribute('class', props.class);
  svg.setAttribute('focusable', 'false');

  if (props['aria-label']) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', props['aria-label']);
  } else if (props['aria-hidden'] !== false) {
    svg.setAttribute('aria-hidden', 'true');
  }

  for (const [tag, attrs] of children) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const key in attrs) {
      el.setAttribute(key, String(attrs[key]));
    }
    svg.appendChild(el);
  }

  return svg;
}
