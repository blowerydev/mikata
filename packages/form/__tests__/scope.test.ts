/**
 * Tests for form.scope(path) — scoped sub-form handles for nested/array fields.
 */

import { describe, it, expect } from 'vitest';
import { createForm } from '../src/create-form';

describe('form.scope()', () => {
  it('reads and writes nested values through the scope', () => {
    const form = createForm({
      initialValues: {
        addresses: [{ street: 'A', city: 'X' }, { street: 'B', city: 'Y' }],
      },
    });

    const addr0 = form.scope('addresses.0');
    expect(addr0.path).toBe('addresses.0');
    expect(addr0.getValue('street')).toBe('A');

    addr0.setFieldValue('street', 'A2');
    expect(form.getValue('addresses.0.street')).toBe('A2');
    expect(form.getValue('addresses.1.street')).toBe('B');
  });

  it('getInputProps writes through the scoped prefix', () => {
    const form = createForm({ initialValues: { user: { name: '' } } });
    const user = form.scope('user');

    const props = user.getInputProps('name');
    props.onChange({ target: { value: 'Ada' } });
    expect(form.getValue('user.name')).toBe('Ada');
  });

  it('errors() returns only keys under the scope, with prefix stripped', () => {
    const form = createForm({
      initialValues: { a: { b: 1 }, c: 2 },
    });
    form.setErrors({
      'a.b': 'nested error',
      'a': 'group-level error',
      'c': 'other',
    });

    const a = form.scope('a');
    expect(a.errors()).toEqual({ '': 'group-level error', b: 'nested error' });

    // Root (empty path) returns all errors.
    expect(form.scope('').errors()).toEqual({
      'a.b': 'nested error',
      a: 'group-level error',
      c: 'other',
    });
  });

  it('array helpers target the scoped array', () => {
    const form = createForm({
      initialValues: { items: [{ name: 'x' }] },
    });
    const root = form.scope('');
    root.insertListItem('items', { name: 'y' });
    expect(form.getValue('items')).toEqual([{ name: 'x' }, { name: 'y' }]);

    root.removeListItem('items', 0);
    expect(form.getValue('items')).toEqual([{ name: 'y' }]);
  });

  it('nests further via scope(subPath)', () => {
    const form = createForm({
      initialValues: { teams: [{ members: [{ name: 'Ada' }] }] },
    });
    const member = form.scope('teams.0').scope('members.0');
    expect(member.path).toBe('teams.0.members.0');
    member.setFieldValue('name', 'Grace');
    expect(form.getValue('teams.0.members.0.name')).toBe('Grace');
  });
});
