import type { IconNode, IconProps } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build an SVG DOM node from a Lucide/Tabler-shaped icon tuple.
 *
 * ```ts
 * import { createIcon } from '@mikata/icons';
 * import { Camera } from 'lucide';
 * document.body.appendChild(createIcon(Camera, { size: 20 }));
 * ```
 *
 * Accepts an `IconNode` tuple `[tag, attrs, children[]]` (Lucide and Tabler
 * both export in this shape) and returns an `SVGSVGElement`. Decorative by
 * default (`aria-hidden="true"`); pass `aria-label` for an announced icon.
 */
export function createIcon(
  node: IconNode,
  props: IconProps = {}
): SVGSVGElement {
  const [rootTag, rootAttrs, children] = node;
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
