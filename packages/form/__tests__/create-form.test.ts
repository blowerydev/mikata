import { describe, it, expect, vi } from 'vitest';
import { flushSync } from '@mikata/reactivity';
import { createForm } from '../src/create-form';

describe('createForm - values', () => {
  it('starts with a deep clone of initialValues', () => {
    const initial = { a: { b: 1 }, items: [{ n: 1 }] };
    const form = createForm({ initialValues: initial });
    expect(form.getValues()).toEqual(initial);
    expect(form.getValues()).not.toBe(initial);
  });

  it('setFieldValue updates nested paths', () => {
    const form = createForm({ initialValues: { a: { b: 1 } } });
    form.setFieldValue('a.b', 42);
    expect(form.getValue('a.b')).toBe(42);
  });

  it('setValues merges top-level', () => {
    const form = createForm({ initialValues: { a: 1, b: 2 } });
    form.setValues({ a: 10 });
    expect(form.getValues()).toEqual({ a: 10, b: 2 });
  });

  it('setValues accepts an updater function', () => {
    const form = createForm({ initialValues: { count: 0 } });
    form.setValues((prev) => ({ count: prev.count + 1 }));
    expect(form.getValue('count')).toBe(1);
  });

  it('reset restores initialValues and clears errors', () => {
    const form = createForm({ initialValues: { a: 1 } });
    form.setFieldValue('a', 5);
    form.setFieldError('a', 'bad');
    form.reset();
    expect(form.getValue('a')).toBe(1);
    expect(form.errors).toEqual({});
  });

  it('initialize replaces the initial snapshot', () => {
    const form = createForm({ initialValues: { a: 1 } });
    form.setFieldValue('a', 9);
    expect(form.isDirty()).toBe(true);
    form.initialize({ a: 9 });
    expect(form.isDirty()).toBe(false);
  });
});

describe('createForm - errors', () => {
  it('setFieldError / clearFieldError round-trip', () => {
    const form = createForm({ initialValues: { a: 1 } });
    form.setFieldError('a', 'bad');
    expect(form.errors.a).toBe('bad');
    form.clearFieldError('a');
    expect(form.errors.a).toBeUndefined();
  });

  it('clearInputErrorOnChange clears error when value changes', () => {
    const form = createForm({ initialValues: { a: 1 }, clearInputErrorOnChange: true });
    form.setFieldError('a', 'bad');
    form.setFieldValue('a', 2);
    expect(form.errors.a).toBeUndefined();
  });

  it('clearInputErrorOnChange: false preserves error', () => {
    const form = createForm({ initialValues: { a: 1 }, clearInputErrorOnChange: false });
    form.setFieldError('a', 'bad');
    form.setFieldValue('a', 2);
    expect(form.errors.a).toBe('bad');
  });
});

describe('createForm - validation', () => {
  it('runs object spec and returns errors', () => {
    const form = createForm({
      initialValues: { email: '', password: '' },
      validate: {
        email: (v) => (v ? null : 'Required'),
        password: (v) => ((v as string).length < 8 ? 'Too short' : null),
      },
    });
    const { hasErrors, errors } = form.validate();
    expect(hasErrors).toBe(true);
    expect(errors.email).toBe('Required');
    expect(errors.password).toBe('Too short');
  });

  it('runs function spec', () => {
    const form = createForm({
      initialValues: { a: 0 },
      validate: (values) => (values.a < 10 ? { a: 'Too small' } : {}),
    });
    expect(form.validate().errors.a).toBe('Too small');
  });

  it('validates array element specs', () => {
    const form = createForm({
      initialValues: { items: [{ n: '' }, { n: 'ok' }] },
      validate: { items: { n: (v) => (v ? null : 'Required') } },
    });
    const { errors } = form.validate();
    expect(errors['items.0.n']).toBe('Required');
    expect(errors['items.1.n']).toBeUndefined();
  });

  it('validateField runs only one path', () => {
    const form = createForm({
      initialValues: { a: '', b: '' },
      validate: {
        a: (v) => (v ? null : 'a required'),
        b: (v) => (v ? null : 'b required'),
      },
    });
    form.validateField('a');
    expect(form.errors.a).toBe('a required');
    expect(form.errors.b).toBeUndefined();
  });

  it('isValid reflects current errors', () => {
    const form = createForm({
      initialValues: { a: '' },
      validate: { a: (v) => (v ? null : 'req') },
    });
    expect(form.isValid()).toBe(true);
    form.validate();
    expect(form.isValid()).toBe(false);
  });
});

describe('createForm - dirty / touched', () => {
  it('isDirty toggles after setFieldValue', () => {
    const form = createForm({ initialValues: { a: 1 } });
    expect(form.isDirty()).toBe(false);
    form.setFieldValue('a', 2);
    expect(form.isDirty()).toBe(true);
  });

  it('isDirty(path) checks a single field', () => {
    const form = createForm({ initialValues: { a: 1, b: 2 } });
    form.setFieldValue('a', 9);
    expect(form.isDirty('a')).toBe(true);
    expect(form.isDirty('b')).toBe(false);
  });

  it('getDirty returns a flat map of changed paths', () => {
    const form = createForm({ initialValues: { a: { b: 1 }, c: 2 } });
    form.setFieldValue('a.b', 99);
    expect(form.getDirty()).toEqual({ 'a.b': true });
  });

  it('onBlur marks a field as touched (via getInputProps)', () => {
    const form = createForm({ initialValues: { a: 1 } });
    const props = form.getInputProps('a');
    props.onBlur(new FocusEvent('blur'));
    expect(form.isTouched('a')).toBe(true);
  });
});

describe('createForm - submit', () => {
  it('calls onValid with raw values when valid', () => {
    const form = createForm({ initialValues: { a: 'hi' }, validate: { a: () => null } });
    const onValid = vi.fn();
    const handler = form.onSubmit(onValid);
    const event = new Event('submit');
    event.preventDefault = vi.fn();
    handler(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onValid).toHaveBeenCalledWith({ a: 'hi' }, event);
  });

  it('calls onInvalid with errors when invalid', () => {
    const form = createForm({
      initialValues: { a: '' },
      validate: { a: (v) => (v ? null : 'Required') },
    });
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const handler = form.onSubmit(onValid, onInvalid);
    const event = new Event('submit');
    event.preventDefault = vi.fn();
    handler(event);
    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith({ a: 'Required' }, event);
  });

  it('onReset restores initial values', () => {
    const form = createForm({ initialValues: { a: 1 } });
    form.setFieldValue('a', 5);
    const handler = form.onReset();
    const event = new Event('reset');
    event.preventDefault = vi.fn();
    handler(event);
    expect(form.getValue('a')).toBe(1);
  });
});

describe('createForm - getInputProps', () => {
  it("default type='input' returns value/onChange/onBlur", () => {
    const form = createForm({ initialValues: { name: 'alice' } });
    const props = form.getInputProps('name');
    expect(props.value).toBe('alice');
    expect(typeof props.onChange).toBe('function');
    expect(typeof props.onBlur).toBe('function');
    expect(props.checked).toBeUndefined();
  });

  it("type='checkbox' returns checked instead of value", () => {
    const form = createForm({ initialValues: { agreed: true } });
    const props = form.getInputProps('agreed', { type: 'checkbox' });
    expect(props.checked).toBe(true);
    expect(props.value).toBeUndefined();
  });

  it('onChange handles DOM events (input type)', () => {
    const form = createForm({ initialValues: { name: '' } });
    const props = form.getInputProps('name');
    props.onChange({ target: { value: 'bob' } });
    expect(form.getValue('name')).toBe('bob');
  });

  it('onChange handles DOM events (checkbox type)', () => {
    const form = createForm({ initialValues: { agreed: false } });
    const props = form.getInputProps('agreed', { type: 'checkbox' });
    props.onChange({ target: { checked: true } });
    expect(form.getValue('agreed')).toBe(true);
  });

  it('onChange accepts raw values too', () => {
    const form = createForm({ initialValues: { qty: 0 } });
    const props = form.getInputProps('qty');
    props.onChange(42);
    expect(form.getValue('qty')).toBe(42);
  });

  it('exposes a reactive error getter bound to the field path', () => {
    const form = createForm({ initialValues: { name: '' } });
    const props = form.getInputProps('name');
    expect(typeof props.error).toBe('function');
    expect(props.error!()).toBeUndefined();
    form.setFieldError('name', 'Required');
    expect(props.error!()).toBe('Required');
    form.clearFieldError('name');
    expect(props.error!()).toBeUndefined();
  });
});

describe('createForm - list helpers', () => {
  it('insertListItem appends by default', () => {
    const form = createForm({ initialValues: { items: [{ n: 1 }] } });
    form.insertListItem('items', { n: 2 });
    expect(form.getValue('items')).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it('insertListItem at index', () => {
    const form = createForm({ initialValues: { items: [{ n: 1 }, { n: 3 }] } });
    form.insertListItem('items', { n: 2 }, 1);
    expect(form.getValue('items')).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it('removeListItem drops by index', () => {
    const form = createForm({ initialValues: { items: [1, 2, 3] } });
    form.removeListItem('items', 1);
    expect(form.getValue('items')).toEqual([1, 3]);
  });

  it('removeListItem shifts errors for subsequent indices', () => {
    const form = createForm({ initialValues: { items: [{ n: '' }, { n: '' }, { n: '' }] } });
    form.setFieldError('items.1.n', 'b');
    form.setFieldError('items.2.n', 'c');
    form.removeListItem('items', 0);
    expect(form.errors['items.0.n']).toBe('b');
    expect(form.errors['items.1.n']).toBe('c');
    expect(form.errors['items.2.n']).toBeUndefined();
  });

  it('reorderListItem swaps', () => {
    const form = createForm({ initialValues: { items: ['a', 'b', 'c'] } });
    form.reorderListItem('items', { from: 0, to: 2 });
    expect(form.getValue('items')).toEqual(['b', 'c', 'a']);
  });

  it('replaceListItem replaces element', () => {
    const form = createForm({ initialValues: { items: [1, 2, 3] } });
    form.replaceListItem('items', 1, 99);
    expect(form.getValue('items')).toEqual([1, 99, 3]);
  });
});

describe('createForm - watch', () => {
  it('fires when the watched path changes', () => {
    const form = createForm({ initialValues: { a: 1 } });
    const cb = vi.fn();
    const dispose = form.watch('a', cb);
    flushSync();
    form.setFieldValue('a', 2);
    flushSync();
    expect(cb).toHaveBeenCalledWith(2);
    dispose();
  });

  it('does not fire after dispose', () => {
    const form = createForm({ initialValues: { a: 1 } });
    const cb = vi.fn();
    const dispose = form.watch('a', cb);
    flushSync();
    dispose();
    form.setFieldValue('a', 2);
    flushSync();
    expect(cb).not.toHaveBeenCalled();
  });
});
