/**
 * Demo session wiring. One cookie, signed payload, plain-text dev
 * secret so the example runs without any environment setup. Real apps
 * would pull `secret` from an env var and turn on `secure: true`.
 */

import { createSessionCookie } from '@mikata/kit/session';

export interface SessionData {
  userId: string;
  name: string;
}

export const session = createSessionCookie<SessionData>({
  name: 'mikata_demo_sid',
  secret: 'demo-secret-not-for-production',
  cookie: {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // 7 days — enough for the demo to notice persistence across
    // refreshes without living forever.
    maxAge: 60 * 60 * 24 * 7,
  },
});
