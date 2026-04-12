import { describe, it, expect } from 'vitest';
import { createIcon } from '../src/create-icon';
import type { IconNode } from '../src/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

const sample: IconNode = [
  'svg',
  {
    xmlns: SVG_NS,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
  },
  [
    ['path', { d: 'M0 0h24v24H0z' }],
    ['circle', { cx: 12, cy: 12, r: 4 }],
  ],
];

describe('createIcon', () => {
  it('returns an SVGSVGElement in the SVG namespace', () => {
    const svg = createIcon(sample);
    expect(svg).toBeInstanceOf(SVGElement);
    expect(svg.namespaceURI).toBe(SVG_NS);
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('applies default size of 24x24 and focusable=false', () => {
    const svg = createIcon(sample);
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('height')).toBe('24');
    expect(svg.getAttribute('focusable')).toBe('false');
  });

  it('preserves root attrs from the icon node', () => {
    const svg = createIcon(sample);
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('stroke-width')).toBe('2');
  });

  it('overrides size, color, strokeWidth, and class', () => {
    const svg = createIcon(sample, {
      size: 16,
      color: 'red',
      strokeWidth: 1.5,
      class: 'my-icon',
    });
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.getAttribute('height')).toBe('16');
    expect(svg.getAttribute('stroke')).toBe('red');
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
    expect(svg.getAttribute('class')).toBe('my-icon');
  });

  it('sets role=img and aria-label when aria-label is provided', () => {
    const svg = createIcon(sample, { 'aria-label': 'Close' });
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Close');
    expect(svg.getAttribute('aria-hidden')).toBeNull();
  });

  it('defaults to aria-hidden=true when no label provided', () => {
    const svg = createIcon(sample);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('respects aria-hidden=false to omit the attribute', () => {
    const svg = createIcon(sample, { 'aria-hidden': false });
    expect(svg.getAttribute('aria-hidden')).toBeNull();
  });

  it('creates child elements in the SVG namespace with attrs applied', () => {
    const svg = createIcon(sample);
    expect(svg.children).toHaveLength(2);
    const [path, circle] = Array.from(svg.children);
    expect(path.namespaceURI).toBe(SVG_NS);
    expect(path.tagName.toLowerCase()).toBe('path');
    expect(path.getAttribute('d')).toBe('M0 0h24v24H0z');
    expect(circle.tagName.toLowerCase()).toBe('circle');
    expect(circle.getAttribute('cx')).toBe('12');
    expect(circle.getAttribute('r')).toBe('4');
  });

  it('handles icons with no children', () => {
    const empty: IconNode = ['svg', { viewBox: '0 0 24 24' }, []];
    const svg = createIcon(empty);
    expect(svg.children).toHaveLength(0);
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('does not set stroke when no color is provided (preserves root stroke)', () => {
    const svg = createIcon(sample);
    expect(svg.getAttribute('stroke')).toBe('currentColor');
  });
});
