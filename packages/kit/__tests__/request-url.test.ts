import { describe, it, expect } from 'vitest';
import type { IncomingMessage } from 'node:http';
import {
  resolveRequestOrigin,
  buildRequestUrl,
} from '../src/request-url';

function makeReq(opts: {
  url?: string;
  headers?: Record<string, string | string[]>;
  encrypted?: boolean;
}): IncomingMessage {
  return {
    url: opts.url ?? '/',
    headers: opts.headers ?? {},
    socket: { encrypted: opts.encrypted ?? false } as never,
  } as unknown as IncomingMessage;
}

describe('resolveRequestOrigin', () => {
  it('reads req.headers.host and infers http when not encrypted', () => {
    const req = makeReq({ headers: { host: 'example.com' } });
    expect(resolveRequestOrigin(req)).toEqual({
      scheme: 'http',
      host: 'example.com',
    });
  });

  it('infers https when the socket is TLS', () => {
    const req = makeReq({ headers: { host: 'example.com' }, encrypted: true });
    expect(resolveRequestOrigin(req).scheme).toBe('https');
  });

  it('falls back to "localhost" when no host header is present', () => {
    const req = makeReq({});
    expect(resolveRequestOrigin(req)).toEqual({
      scheme: 'http',
      host: 'localhost',
    });
  });

  it('IGNORES x-forwarded-host by default (security default)', () => {
    const req = makeReq({
      headers: {
        host: 'example.com',
        'x-forwarded-host': 'attacker.example',
        'x-forwarded-proto': 'https',
      },
    });
    expect(resolveRequestOrigin(req)).toEqual({
      scheme: 'http',
      host: 'example.com',
    });
  });

  it('reads x-forwarded-* when trustProxy is true', () => {
    const req = makeReq({
      headers: {
        host: 'internal-pod-7',
        'x-forwarded-host': 'public.example.com',
        'x-forwarded-proto': 'https',
      },
    });
    expect(resolveRequestOrigin(req, { trustProxy: true })).toEqual({
      scheme: 'https',
      host: 'public.example.com',
    });
  });

  it('takes the first value from a comma-separated forwarded header', () => {
    const req = makeReq({
      headers: {
        host: 'internal',
        'x-forwarded-host': 'first.example, second.example, third.example',
        'x-forwarded-proto': 'https,http',
      },
    });
    expect(resolveRequestOrigin(req, { trustProxy: true })).toEqual({
      scheme: 'https',
      host: 'first.example',
    });
  });

  it('falls back to host header when forwarded header is missing under trustProxy', () => {
    const req = makeReq({
      headers: { host: 'example.com' },
    });
    expect(resolveRequestOrigin(req, { trustProxy: true })).toEqual({
      scheme: 'http',
      host: 'example.com',
    });
  });

  it('handles array-valued host headers', () => {
    const req = makeReq({
      headers: { host: ['a.example', 'b.example'] as unknown as string },
    });
    expect(resolveRequestOrigin(req).host).toBe('a.example');
  });
});

describe('buildRequestUrl', () => {
  it('concatenates scheme + host + req.url', () => {
    const req = makeReq({ url: '/foo?bar=1', headers: { host: 'a.test' } });
    expect(buildRequestUrl(req)).toBe('http://a.test/foo?bar=1');
  });

  it('defaults the path to "/" when req.url is missing', () => {
    const req = makeReq({ headers: { host: 'a.test' } });
    expect(buildRequestUrl(req)).toBe('http://a.test/');
  });
});
