import { describe, it, expect } from 'vitest';
import {
  parseCookieHeader,
  serializeCookie,
  createCookies,
} from '../src/cookies';

describe('parseCookieHeader', () => {
  it('returns {} for null / undefined / empty input', () => {
    expect(parseCookieHeader(null)).toEqual({});
    expect(parseCookieHeader(undefined)).toEqual({});
    expect(parseCookieHeader('')).toEqual({});
  });

  it('parses a single cookie', () => {
    expect(parseCookieHeader('foo=bar')).toEqual({ foo: 'bar' });
  });

  it('parses multiple cookies with `; ` separator', () => {
    expect(parseCookieHeader('a=1; b=2; c=3')).toEqual({
      a: '1',
      b: '2',
      c: '3',
    });
  });

  it('decodes percent-encoded values', () => {
    expect(parseCookieHeader('msg=hello%20world')).toEqual({
      msg: 'hello world',
    });
    expect(parseCookieHeader('emoji=%F0%9F%8D%AA')).toEqual({
      emoji: '🍪',
    });
  });

  it('strips wrapping double-quotes from the value', () => {
    expect(parseCookieHeader('name="quoted value"')).toEqual({
      name: 'quoted value',
    });
  });

  it('leaves unbalanced quotes alone', () => {
    expect(parseCookieHeader('a="unterminated; b=ok')).toEqual({
      a: '"unterminated',
      b: 'ok',
    });
  });

  it('ignores malformed pairs without names', () => {
    expect(parseCookieHeader('=value; good=ok')).toEqual({ good: 'ok' });
  });

  it('ignores pairs with no equals sign', () => {
    expect(parseCookieHeader('flag; foo=bar')).toEqual({ foo: 'bar' });
  });

  it('returns the raw value when decodeURIComponent throws', () => {
    // A lone `%` that isn't followed by two hex digits is invalid — the
    // parser must not crash, it returns the raw text.
    expect(parseCookieHeader('bad=%E0%A4%A')).toEqual({ bad: '%E0%A4%A' });
  });

  it('lets later duplicates win', () => {
    expect(parseCookieHeader('x=1; x=2; x=3')).toEqual({ x: '3' });
  });

  it('trims whitespace around name and value', () => {
    expect(parseCookieHeader('  a = 1 ;  b  =  2  ')).toEqual({
      a: '1',
      b: '2',
    });
  });
});

describe('serializeCookie', () => {
  it('encodes the value', () => {
    expect(serializeCookie('msg', 'hello world')).toBe('msg=hello%20world');
  });

  it('emits domain / path / Max-Age', () => {
    expect(
      serializeCookie('sid', 'abc', {
        domain: 'example.com',
        path: '/',
        maxAge: 60,
      }),
    ).toBe('sid=abc; Domain=example.com; Path=/; Max-Age=60');
  });

  it('floors fractional maxAge', () => {
    expect(serializeCookie('x', 'y', { maxAge: 1.9 })).toBe('x=y; Max-Age=1');
  });

  it('emits Expires as an HTTP-date', () => {
    const when = new Date(0);
    expect(serializeCookie('x', 'y', { expires: when })).toBe(
      `x=y; Expires=${when.toUTCString()}`,
    );
  });

  it('emits HttpOnly / Secure flags', () => {
    expect(
      serializeCookie('x', 'y', { httpOnly: true, secure: true }),
    ).toBe('x=y; HttpOnly; Secure');
  });

  it('capitalises sameSite', () => {
    expect(serializeCookie('x', 'y', { sameSite: 'lax' })).toBe(
      'x=y; SameSite=Lax',
    );
    expect(serializeCookie('x', 'y', { sameSite: 'strict' })).toBe(
      'x=y; SameSite=Strict',
    );
    expect(serializeCookie('x', 'y', { sameSite: 'none' })).toBe(
      'x=y; SameSite=None',
    );
  });
});

describe('createCookies', () => {
  it('reads against the inbound snapshot', () => {
    const c = createCookies('a=1; b=2');
    expect(c.get('a')).toBe('1');
    expect(c.get('b')).toBe('2');
    expect(c.get('missing')).toBeUndefined();
  });

  it('queues set() as a Set-Cookie string', () => {
    const c = createCookies(null);
    c.set('sid', 'abc', { path: '/', httpOnly: true });
    expect(c.outgoing()).toEqual(['sid=abc; Path=/; HttpOnly']);
  });

  it('queues delete() with Max-Age=0 + Expires=epoch', () => {
    const c = createCookies(null);
    c.delete('sid', { path: '/' });
    expect(c.outgoing()).toHaveLength(1);
    const out = c.outgoing()[0]!;
    expect(out).toContain('sid=');
    expect(out).toContain('Max-Age=0');
    expect(out).toContain(`Expires=${new Date(0).toUTCString()}`);
    expect(out).toContain('Path=/');
  });

  it('does not mutate the inbound snapshot when writing', () => {
    // Documented behaviour: reads are of the request, writes are for the
    // response. A loader that sets and then re-reads must see the OLD
    // value — the opposite would conflate the two channels.
    const c = createCookies('sid=old');
    c.set('sid', 'new');
    expect(c.get('sid')).toBe('old');
  });

  it('preserves insertion order in outgoing()', () => {
    const c = createCookies(null);
    c.delete('sid');
    c.set('sid', 'fresh', { path: '/' });
    const out = c.outgoing();
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('Max-Age=0');
    expect(out[1]).toContain('sid=fresh');
  });
});
