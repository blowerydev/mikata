import { describe, it, expect } from 'vitest';
import { createSessionCookie } from '../src/session';
import { createCookies } from '../src/cookies';

describe('createSessionCookie', () => {
  it('round-trips a payload through commit → read', () => {
    const session = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: 'secret-key-0',
    });

    const outgoing = createCookies(null);
    session.commit({ userId: 'u1' }, outgoing);
    const [setCookie] = outgoing.outgoing();
    expect(setCookie).toBeDefined();

    // Simulate the browser sending the cookie back — pull `sid=...`
    // out of the Set-Cookie header and build an inbound cookie header
    // for the next request.
    const inbound = createCookies(cookieNameValuePair(setCookie!));
    const payload = session.read(inbound);
    expect(payload).toEqual({ userId: 'u1' });
  });

  it('rejects a cookie whose payload was tampered with', () => {
    const session = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: 'secret-key-0',
    });

    const outgoing = createCookies(null);
    session.commit({ userId: 'u1' }, outgoing);
    const signed = cookieValue(outgoing.outgoing()[0]!);
    const dot = signed.lastIndexOf('.');
    // Replace the payload with a new base64url value but keep the
    // original HMAC — the verify step must notice and reject.
    const fakePayload = Buffer.from(
      JSON.stringify({ userId: 'attacker' }),
      'utf8',
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const tampered = `${fakePayload}.${signed.slice(dot + 1)}`;

    const inbound = createCookies(`sid=${encodeURIComponent(tampered)}`);
    expect(session.read(inbound)).toBeUndefined();
  });

  it('rejects a cookie signed with a different secret', () => {
    const signer = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: 'old-secret',
    });
    const reader = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: 'new-secret',
    });

    const outgoing = createCookies(null);
    signer.commit({ userId: 'u1' }, outgoing);
    const inbound = createCookies(cookieNameValuePair(outgoing.outgoing()[0]!));
    expect(reader.read(inbound)).toBeUndefined();
  });

  it('accepts old cookies during secret rotation', () => {
    const oldSession = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: 'old-secret',
    });
    // Primary secret is first; old-secret is kept around so in-flight
    // sessions don't log everyone out on deploy.
    const rotated = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: ['new-secret', 'old-secret'],
    });

    const outgoing = createCookies(null);
    oldSession.commit({ userId: 'u1' }, outgoing);
    const inbound = createCookies(cookieNameValuePair(outgoing.outgoing()[0]!));
    expect(rotated.read(inbound)).toEqual({ userId: 'u1' });

    // A fresh commit uses the first (new) secret — a strict reader
    // that only knows old-secret can no longer verify it.
    const freshOut = createCookies(null);
    rotated.commit({ userId: 'u2' }, freshOut);
    const onOldReader = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: 'old-secret',
    });
    const freshIn = createCookies(cookieNameValuePair(freshOut.outgoing()[0]!));
    expect(onOldReader.read(freshIn)).toBeUndefined();
  });

  it('returns undefined when the cookie is missing', () => {
    const session = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: 'k',
    });
    expect(session.read(createCookies(null))).toBeUndefined();
  });

  it('returns undefined for a malformed cookie (no separator)', () => {
    const session = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: 'k',
    });
    const inbound = createCookies('sid=not-signed');
    expect(session.read(inbound)).toBeUndefined();
  });

  it('applies default cookie options on commit', () => {
    const session = createSessionCookie<{ userId: string }>({
      name: 'sid',
      secret: 'k',
      cookie: { path: '/', httpOnly: true, sameSite: 'lax' },
    });
    const out = createCookies(null);
    session.commit({ userId: 'u1' }, out);
    const s = out.outgoing()[0]!;
    expect(s).toContain('Path=/');
    expect(s).toContain('HttpOnly');
    expect(s).toContain('SameSite=Lax');
  });

  it('destroy queues a Max-Age=0 deletion at the default path', () => {
    const session = createSessionCookie({
      name: 'sid',
      secret: 'k',
      cookie: { path: '/admin' },
    });
    const out = createCookies(null);
    session.destroy(out);
    const s = out.outgoing()[0]!;
    expect(s).toContain('Max-Age=0');
    // Must match the default path — otherwise the browser keeps the
    // original cookie around and the user stays logged in.
    expect(s).toContain('Path=/admin');
  });

  it('throws when the secret is empty', () => {
    expect(() =>
      createSessionCookie({ name: 'sid', secret: '' }),
    ).toThrow(/secret/i);
    expect(() =>
      createSessionCookie({ name: 'sid', secret: [] }),
    ).toThrow(/secret/i);
  });
});

// Extract the `name=value` portion of a Set-Cookie header so it can be
// fed straight into a fresh `Cookie` header for the "next request".
function cookieNameValuePair(setCookie: string): string {
  const firstSemi = setCookie.indexOf(';');
  return firstSemi < 0 ? setCookie : setCookie.slice(0, firstSemi);
}

// Grab the decoded value half of a Set-Cookie string — handy for
// tampering tests that want to surgically edit the signed blob.
function cookieValue(setCookie: string): string {
  const pair = cookieNameValuePair(setCookie);
  const eq = pair.indexOf('=');
  return decodeURIComponent(pair.slice(eq + 1));
}
