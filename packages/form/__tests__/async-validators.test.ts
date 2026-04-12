/**
 * Tests for async field validators — cancellation, debounce, isValidating.
 */

import { describe, it, expect, vi } from 'vitest';
import { createForm } from '../src/create-form';

function nextTick(ms = 0): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('async validators', () => {
  it('applies a resolved Promise error to the field', async () => {
    const form = createForm({
      initialValues: { email: '' },
      validateInputOnChange: true,
      validate: {
        email: async (v) => (v === 'taken@x.com' ? 'Email taken' : null),
      },
    });

    form.setFieldValue('email', 'taken@x.com');
    expect(form.isValidating('email')).toBe(true);

    await nextTick(0);
    await nextTick(0);

    expect(form.isValidating('email')).toBe(false);
    expect(form.errors.email).toBe('Email taken');
  });

  it('drops stale results when a newer change supersedes them', async () => {
    let resolveFirst!: (v: string | null) => void;
    const validator = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<string | null>((res) => (resolveFirst = res)),
      )
      .mockImplementationOnce(() => Promise.resolve(null));

    const form = createForm({
      initialValues: { email: '' },
      validateInputOnChange: true,
      validate: { email: validator },
    });

    form.setFieldValue('email', 'first');
    expect(form.isValidating('email')).toBe(true);
    form.setFieldValue('email', 'second'); // cancels first

    await nextTick(0);
    // Resolve the (now stale) first one with an error — it must be ignored.
    resolveFirst('stale error');
    await nextTick(0);
    await nextTick(0);

    expect(form.errors.email).toBeUndefined();
    expect(form.isValidating('email')).toBe(false);
  });

  it('isValidating() with no argument reflects any pending field', async () => {
    let resolve!: (v: string | null) => void;
    const form = createForm({
      initialValues: { a: '', b: '' },
      validateInputOnChange: true,
      validate: {
        a: () => new Promise<string | null>((r) => (resolve = r)),
        b: () => null,
      },
    });

    form.setFieldValue('a', 'x');
    expect(form.isValidating()).toBe(true);
    expect(form.isValidating('a')).toBe(true);
    expect(form.isValidating('b')).toBe(false);

    resolve(null);
    await nextTick(0);
    await nextTick(0);

    expect(form.isValidating()).toBe(false);
  });

  it('debounces calls when asyncDebounceMs is set', async () => {
    const validator = vi.fn().mockResolvedValue(null);
    const form = createForm({
      initialValues: { q: '' },
      validateInputOnChange: true,
      asyncDebounceMs: 30,
      validate: { q: validator },
    });

    form.setFieldValue('q', 'a');
    form.setFieldValue('q', 'ab');
    form.setFieldValue('q', 'abc');
    expect(validator).not.toHaveBeenCalled();

    await nextTick(50);
    await nextTick(0);

    expect(validator).toHaveBeenCalledTimes(1);
    expect(validator.mock.calls[0][0]).toBe('abc');
  });

  it('full-form validate() skips Promise-returning validators', () => {
    const form = createForm({
      initialValues: { email: 'x', name: '' },
      validate: {
        email: async () => 'async error',
        name: (v) => (v ? null : 'required'),
      },
    });

    const { errors } = form.validate();
    expect(errors.email).toBeUndefined();
    expect(errors.name).toBe('required');
  });

  it('sync validators stay immediate (no debounce by default)', () => {
    const form = createForm({
      initialValues: { n: '' },
      validateInputOnChange: true,
      validate: { n: (v) => (v ? null : 'required') },
    });
    form.setFieldValue('n', '');
    // Because the initialValues are '' and setting to '' still triggers the
    // validator on change, the sync error should be applied immediately.
    expect(form.errors.n).toBe('required');
  });
});
