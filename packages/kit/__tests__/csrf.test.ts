import { describe, it, expect } from 'vitest';
import {
  CSRF_COOKIE_NAME,
  CSRF_FORM_FIELD,
  CSRF_HEADER,
} from '../src/csrf';
import {
  generateCsrfToken,
  ensureCsrfToken,
  verifyCsrfFromRequest,
} from '../src/csrf-server';
import { createCookies } from '../src/cookies';

describe('generateCsrfToken', () => {
  it('returns a base64url string of at least 32 characters', () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bytes → 43 base64url chars (no padding).
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it('returns a different value on each call', () => {
    const a = generateCsrfToken();
    const b = generateCsrfToken();
    expect(a).not.toBe(b);
  });
});

describe('ensureCsrfToken', () => {
  it('mints a fresh token and queues a Set-Cookie when the cookie is missing', () => {
    const cookies = createCookies(null);
    const token = ensureCsrfToken(cookies);
    expect(token).toBeTruthy();

    const [setCookie] = cookies.outgoing();
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain(`${CSRF_COOKIE_NAME}=${token}`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
  });

  it('returns the existing cookie value without re-issuing', () => {
    const existing = 'a'.repeat(32);
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=${existing}`);
    const token = ensureCsrfToken(cookies);
    expect(token).toBe(existing);
    expect(cookies.outgoing()).toHaveLength(0);
  });

  it('regenerates when the stored value is too short to be a real token', () => {
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=oops`);
    const token = ensureCsrfToken(cookies);
    expect(token).not.toBe('oops');
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(cookies.outgoing()).toHaveLength(1);
  });

  it('respects a custom cookie name', () => {
    const cookies = createCookies(null);
    const token = ensureCsrfToken(cookies, { cookieName: 'my_csrf' });
    const [setCookie] = cookies.outgoing();
    expect(setCookie).toContain(`my_csrf=${token}`);
  });

  it('merges caller-supplied cookie options over the defaults', () => {
    const cookies = createCookies(null);
    ensureCsrfToken(cookies, { cookie: { secure: true, sameSite: 'strict' } });
    const [setCookie] = cookies.outgoing();
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');
    // HttpOnly stays as a default since caller didn't override it.
    expect(setCookie).toContain('HttpOnly');
  });
});

describe('verifyCsrfFromRequest', () => {
  const token = 'b'.repeat(32);

  function formRequest(body: string): Request {
    return new Request('http://x/post', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
  }

  it('returns true when header token matches the cookie', async () => {
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=${token}`);
    const req = new Request('http://x/post', {
      method: 'POST',
      headers: { [CSRF_HEADER]: token },
    });
    expect(await verifyCsrfFromRequest(req, cookies)).toBe(true);
  });

  it('returns true when form field token matches the cookie', async () => {
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=${token}`);
    const body = `${CSRF_FORM_FIELD}=${token}&name=ada`;
    expect(await verifyCsrfFromRequest(formRequest(body), cookies)).toBe(true);
  });

  it('returns false when the cookie is missing entirely', async () => {
    const cookies = createCookies(null);
    const req = new Request('http://x/post', {
      method: 'POST',
      headers: { [CSRF_HEADER]: token },
    });
    expect(await verifyCsrfFromRequest(req, cookies)).toBe(false);
  });

  it('returns false when the header token does not match', async () => {
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=${token}`);
    const req = new Request('http://x/post', {
      method: 'POST',
      headers: { [CSRF_HEADER]: 'c'.repeat(32) },
    });
    expect(await verifyCsrfFromRequest(req, cookies)).toBe(false);
  });

  it('returns false when neither header nor form field is supplied', async () => {
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=${token}`);
    const body = 'name=ada';
    expect(await verifyCsrfFromRequest(formRequest(body), cookies)).toBe(false);
  });

  it('prefers header over form field (avoids touching the body)', async () => {
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=${token}`);
    // Header matches cookie; form field would *not* — header must win.
    const req = new Request('http://x/post', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        [CSRF_HEADER]: token,
      },
      body: `${CSRF_FORM_FIELD}=wrong-value`,
    });
    expect(await verifyCsrfFromRequest(req, cookies)).toBe(true);
    // Body wasn't consumed — the action can still read formData.
    const form = await req.formData();
    expect(form.get(CSRF_FORM_FIELD)).toBe('wrong-value');
  });

  it('leaves the request body readable after verifying via form field', async () => {
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=${token}`);
    const body = `${CSRF_FORM_FIELD}=${token}&name=ada`;
    const req = formRequest(body);
    await verifyCsrfFromRequest(req, cookies);
    const form = await req.formData();
    expect(form.get('name')).toBe('ada');
  });

  it('returns false for a non-form content type without a header', async () => {
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=${token}`);
    const req = new Request('http://x/post', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ _csrf: token }),
    });
    expect(await verifyCsrfFromRequest(req, cookies)).toBe(false);
  });

  it('differentiates same-length mismatched tokens (constant-time)', async () => {
    const cookies = createCookies(`${CSRF_COOKIE_NAME}=${token}`);
    const req = new Request('http://x/post', {
      method: 'POST',
      headers: { [CSRF_HEADER]: token.replace(/b/g, 'c') },
    });
    expect(await verifyCsrfFromRequest(req, cookies)).toBe(false);
  });
});
