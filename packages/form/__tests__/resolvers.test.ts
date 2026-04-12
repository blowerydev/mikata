import { describe, it, expect } from 'vitest';
import { zodResolver } from '../src/resolvers/zod';
import { yupResolver } from '../src/resolvers/yup';
import { valibotResolver } from '../src/resolvers/valibot';
import { superstructResolver } from '../src/resolvers/superstruct';
import { joiResolver } from '../src/resolvers/joi';

// Minimal Zod-shaped mock (we don't depend on the real package for these unit
// tests — resolvers are ~15 LOC translators and we verify the mapping).
function mockZod() {
  return {
    safeParse(value: unknown) {
      const errs: { path: (string | number)[]; message: string }[] = [];
      const v = value as { email?: string; age?: number };
      if (!v.email || !v.email.includes('@')) errs.push({ path: ['email'], message: 'Invalid email' });
      if ((v.age ?? 0) < 18) errs.push({ path: ['age'], message: 'Too young' });
      if (errs.length === 0) return { success: true };
      return { success: false, error: { issues: errs } };
    },
  };
}

describe('zodResolver', () => {
  it('returns {} on success', () => {
    const resolve = zodResolver(mockZod());
    expect(resolve({ email: 'a@b', age: 20 })).toEqual({});
  });
  it('maps issues to dotted paths', () => {
    const resolve = zodResolver(mockZod());
    expect(resolve({ email: '', age: 5 })).toEqual({
      email: 'Invalid email',
      age: 'Too young',
    });
  });
  it('messages option translates', () => {
    const resolve = zodResolver(mockZod(), {
      messages: (issue) => (issue.path[0] === 'email' ? 'invalide courriel' : null),
    });
    const errors = resolve({ email: '', age: 5 });
    expect(errors.email).toBe('invalide courriel');
    expect(errors.age).toBe('Too young');
  });
});

function mockYup() {
  return {
    validateSync(value: unknown): unknown {
      const v = value as { name?: string };
      if (!v.name) {
        const err: any = new Error('fail');
        err.inner = [{ path: 'name', message: 'Required' }];
        throw err;
      }
      return v;
    },
  };
}

describe('yupResolver', () => {
  it('returns {} on success', () => {
    expect(yupResolver(mockYup())({ name: 'x' })).toEqual({});
  });
  it('maps inner errors', () => {
    expect(yupResolver(mockYup())({ name: '' })).toEqual({ name: 'Required' });
  });
});

describe('valibotResolver', () => {
  it('returns {} on success', () => {
    const safeParse = () => ({ success: true, issues: [] });
    expect(valibotResolver({}, { safeParse })({ a: 1 })).toEqual({});
  });
  it('maps issues via path keys', () => {
    const safeParse = () => ({
      success: false,
      issues: [{ path: [{ key: 'user' }, { key: 'email' }], message: 'Bad' }],
    });
    expect(valibotResolver({}, { safeParse })({})).toEqual({ 'user.email': 'Bad' });
  });
});

function mockSuperstruct() {
  return {
    validate(value: unknown) {
      const v = value as { n?: number };
      if ((v.n ?? 0) < 1) {
        return [
          {
            failures: () => [{ path: ['n'], message: 'Too small' }],
          },
          undefined,
        ] as const;
      }
      return [undefined, v] as const;
    },
  };
}

describe('superstructResolver', () => {
  it('returns {} on success', () => {
    expect(superstructResolver(mockSuperstruct())({ n: 5 })).toEqual({});
  });
  it('maps failures to paths', () => {
    expect(superstructResolver(mockSuperstruct())({ n: 0 })).toEqual({ n: 'Too small' });
  });
});

function mockJoi() {
  return {
    validate(value: unknown) {
      const v = value as { name?: string };
      if (!v.name) {
        return { error: { details: [{ path: ['name'], message: 'Required' }] } };
      }
      return {};
    },
  };
}

describe('joiResolver', () => {
  it('returns {} on success', () => {
    expect(joiResolver(mockJoi())({ name: 'x' })).toEqual({});
  });
  it('maps details to paths', () => {
    expect(joiResolver(mockJoi())({ name: '' })).toEqual({ name: 'Required' });
  });
});
