/**
 * Type-level tests for Phase A router additions (ExtractParams, PathParams,
 * InferSearchSchema, typed navigate). Runs under `vitest` via expectTypeOf -
 * no runtime assertions, but the file must type-check to pass.
 */

import { describe, it, expectTypeOf } from 'vitest';
import { searchParam } from '../src/search-params';
import type {
  ExtractParams,
  PathParams,
  InferSearchSchema,
  NavigateTarget,
  Router,
} from '../src/types';

describe('ExtractParams<P>', () => {
  it('extracts a single param', () => {
    expectTypeOf<ExtractParams<'/users/:id'>>().toEqualTypeOf<'id'>();
  });

  it('extracts multiple params', () => {
    expectTypeOf<
      ExtractParams<'/users/:id/posts/:postId'>
    >().toEqualTypeOf<'id' | 'postId'>();
  });

  it('yields never for paths without params', () => {
    expectTypeOf<ExtractParams<'/about'>>().toEqualTypeOf<never>();
  });
});

describe('PathParams<P>', () => {
  it('yields a keyed record for paths with params', () => {
    expectTypeOf<PathParams<'/users/:id'>>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<PathParams<'/users/:id/posts/:postId'>>().toEqualTypeOf<{
      id: string;
      postId: string;
    }>();
  });

  it('falls back to an open record when no params are declared', () => {
    expectTypeOf<PathParams<'/about'>>().toEqualTypeOf<Record<string, string>>();
  });
});

describe('InferSearchSchema<T>', () => {
  it('recovers each field type from its SearchParamDef', () => {
    const schema = {
      tab: searchParam.string('home'),
      page: searchParam.number(1),
      active: searchParam.boolean(false),
      kind: searchParam.enum(['a', 'b'] as const, 'a'),
    };
    type S = InferSearchSchema<typeof schema>;
    expectTypeOf<S>().toEqualTypeOf<{
      tab: string;
      page: number;
      active: boolean;
      kind: 'a' | 'b';
    }>();
  });
});

describe('NavigateTarget<P> typing', () => {
  it('requires the declared params when path is a literal', () => {
    type T = NavigateTarget<'/users/:id'>;
    // Valid - params shape matches path.
    const ok: T = { path: '/users/:id', params: { id: 1 } };
    expectTypeOf(ok).toMatchTypeOf<T>();

    // A string target is always allowed.
    const asString: T = '/users/42';
    expectTypeOf(asString).toMatchTypeOf<T>();
  });

  it('Router.navigate preserves param typing via its generic', () => {
    type NavFn = Router['navigate'];
    // Type-only: tsc verifies both overloads compile. Never invoked.
    const _compileCheck = (nav: NavFn): void => {
      nav({ path: '/users/:id', params: { id: 7 } });
      nav('/about');
    };
    expectTypeOf(_compileCheck).toBeFunction();
  });
});
