/**
 * Tests for typed search parameter parsing and serialization.
 */

import { describe, it, expect } from 'vitest';
import { searchParam, parseSearchParams, serializeSearchParams } from '../src/search-params';

describe('searchParam builders', () => {
  describe('string()', () => {
    const def = searchParam.string('default');

    it('parses present value', () => {
      expect(def.parse('hello')).toBe('hello');
    });

    it('returns default for null', () => {
      expect(def.parse(null)).toBe('default');
    });

    it('serializes value', () => {
      expect(def.serialize('hello')).toBe('hello');
    });
  });

  describe('number()', () => {
    const def = searchParam.number(1);

    it('parses numeric string', () => {
      expect(def.parse('42')).toBe(42);
    });

    it('returns default for null', () => {
      expect(def.parse(null)).toBe(1);
    });

    it('returns default for NaN', () => {
      expect(def.parse('abc')).toBe(1);
    });

    it('parses zero', () => {
      expect(def.parse('0')).toBe(0);
    });

    it('parses negative', () => {
      expect(def.parse('-5')).toBe(-5);
    });
  });

  describe('boolean()', () => {
    const def = searchParam.boolean(false);

    it('parses "true"', () => {
      expect(def.parse('true')).toBe(true);
    });

    it('parses "false"', () => {
      expect(def.parse('false')).toBe(false);
    });

    it('parses "1"', () => {
      expect(def.parse('1')).toBe(true);
    });

    it('parses "0"', () => {
      expect(def.parse('0')).toBe(false);
    });

    it('returns default for null', () => {
      expect(def.parse(null)).toBe(false);
    });

    it('returns default for unknown string', () => {
      expect(def.parse('maybe')).toBe(false);
    });
  });

  describe('json()', () => {
    const def = searchParam.json<{ role?: string }>({});

    it('parses valid JSON', () => {
      expect(def.parse('{"role":"admin"}')).toEqual({ role: 'admin' });
    });

    it('returns default for null', () => {
      expect(def.parse(null)).toEqual({});
    });

    it('returns default for invalid JSON', () => {
      expect(def.parse('not-json')).toEqual({});
    });

    it('serializes to JSON string', () => {
      expect(def.serialize({ role: 'admin' })).toBe('{"role":"admin"}');
    });
  });

  describe('enum()', () => {
    const def = searchParam.enum(['asc', 'desc'] as const, 'asc');

    it('parses valid enum value', () => {
      expect(def.parse('desc')).toBe('desc');
    });

    it('returns default for invalid value', () => {
      expect(def.parse('random')).toBe('asc');
    });

    it('returns default for null', () => {
      expect(def.parse(null)).toBe('asc');
    });
  });
});

describe('parseSearchParams()', () => {
  it('parses all schema fields', () => {
    const schema = {
      page: searchParam.number(1),
      sort: searchParam.enum(['name', 'date'] as const, 'name'),
      active: searchParam.boolean(true),
    };

    const result = parseSearchParams('?page=3&sort=date&active=false', schema);
    expect(result).toEqual({
      page: 3,
      sort: 'date',
      active: false,
    });
  });

  it('uses defaults for missing params', () => {
    const schema = {
      page: searchParam.number(1),
      sort: searchParam.string('name'),
    };

    const result = parseSearchParams('', schema);
    expect(result).toEqual({
      page: 1,
      sort: 'name',
    });
  });

  it('returns empty object without schema', () => {
    expect(parseSearchParams('?foo=bar', undefined)).toEqual({});
  });
});

describe('serializeSearchParams()', () => {
  it('serializes non-default values', () => {
    const schema = {
      page: searchParam.number(1),
      sort: searchParam.string('name'),
    };

    const result = serializeSearchParams({ page: 3, sort: 'name' }, schema);
    expect(result).toBe('?page=3');
  });

  it('returns empty string when all values are defaults', () => {
    const schema = {
      page: searchParam.number(1),
    };

    expect(serializeSearchParams({ page: 1 }, schema)).toBe('');
  });

  it('returns empty string without schema', () => {
    expect(serializeSearchParams({ foo: 'bar' }, undefined)).toBe('');
  });
});
