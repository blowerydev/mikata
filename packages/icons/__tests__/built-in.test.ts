import { describe, it, expect } from 'vitest';
import { createIcon } from '../src/create-icon';
import * as Icons from '../src/built-in';
import type { IconNode } from '../src/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

describe('built-in icons', () => {
  const entries = Object.entries(Icons) as Array<[string, IconNode]>;

  it('exports at least 25 icons', () => {
    expect(entries.length).toBeGreaterThanOrEqual(25);
  });

  it.each(entries)('%s is a valid IconNode tuple', (_name, node) => {
    expect(Array.isArray(node)).toBe(true);
    expect(node).toHaveLength(3);
    const [tag, attrs, children] = node;
    expect(tag).toBe('svg');
    expect(attrs).toMatchObject({
      xmlns: SVG_NS,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
    });
    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBeGreaterThan(0);
  });

  it.each(entries)('%s renders to a non-empty SVG element', (_name, node) => {
    const svg = createIcon(node, { size: 20 });
    expect(svg.namespaceURI).toBe(SVG_NS);
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.children.length).toBeGreaterThan(0);
    for (const child of Array.from(svg.children)) {
      expect(child.namespaceURI).toBe(SVG_NS);
    }
  });
});
