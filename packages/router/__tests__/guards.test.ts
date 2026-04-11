/**
 * Tests for the guard evaluation pipeline.
 */

import { describe, it, expect, vi } from 'vitest';
import { runGuards } from '../src/guards';
import type { MatchedRoute, RouteGuard } from '../src/types';

const to: MatchedRoute = {
  path: '/admin',
  params: {},
  searchParams: {},
  meta: {},
  hash: '',
  matches: [],
};

const from: MatchedRoute = {
  path: '/',
  params: {},
  searchParams: {},
  meta: {},
  hash: '',
  matches: [],
};

describe('runGuards()', () => {
  it('returns true when no guards', async () => {
    const result = await runGuards([], to, from);
    expect(result).toBe(true);
  });

  it('returns true when all guards allow (void)', async () => {
    const guard: RouteGuard = vi.fn(() => undefined);
    const result = await runGuards([guard], to, from);
    expect(result).toBe(true);
    expect(guard).toHaveBeenCalledWith(to, from);
  });

  it('returns true when guard explicitly allows', async () => {
    const result = await runGuards([() => true], to, from);
    expect(result).toBe(true);
  });

  it('returns false when guard blocks', async () => {
    const result = await runGuards([() => false], to, from);
    expect(result).toBe(false);
  });

  it('returns redirect path when guard redirects (string)', async () => {
    const result = await runGuards([() => '/login'], to, from);
    expect(result).toBe('/login');
  });

  it('returns redirect target when guard redirects (object)', async () => {
    const target = { path: '/login', search: { redirect: '/admin' } };
    const result = await runGuards([() => target], to, from);
    expect(result).toEqual(target);
  });

  it('stops at first blocking guard', async () => {
    const g1 = vi.fn(() => true as const);
    const g2 = vi.fn(() => false as const);
    const g3 = vi.fn(() => true as const);

    const result = await runGuards([g1, g2, g3], to, from);
    expect(result).toBe(false);
    expect(g1).toHaveBeenCalled();
    expect(g2).toHaveBeenCalled();
    expect(g3).not.toHaveBeenCalled();
  });

  it('stops at first redirect', async () => {
    const g1 = vi.fn(() => true as const);
    const g2 = vi.fn(() => '/login');
    const g3 = vi.fn(() => true as const);

    const result = await runGuards([g1, g2, g3], to, from);
    expect(result).toBe('/login');
    expect(g3).not.toHaveBeenCalled();
  });

  it('handles async guards', async () => {
    const guard: RouteGuard = async (to, from) => {
      await new Promise((r) => setTimeout(r, 10));
      return true;
    };
    const result = await runGuards([guard], to, from);
    expect(result).toBe(true);
  });

  it('handles mixed sync and async guards', async () => {
    const g1: RouteGuard = () => true;
    const g2: RouteGuard = async () => {
      await new Promise((r) => setTimeout(r, 10));
      return undefined;
    };
    const result = await runGuards([g1, g2], to, from);
    expect(result).toBe(true);
  });
});
