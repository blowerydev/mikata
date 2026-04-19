/**
 * Demo API route: `GET /api/ping` → `{ ok: true, at: <iso timestamp> }`.
 *
 * A route file becomes an API route when it has no `default` export and
 * exports at least one HTTP verb (`GET / POST / PUT / PATCH / DELETE`).
 * Kit's plugin classifies this automatically — the file lives under
 * `routes/`, shares the URL namespace with page routes, and bypasses
 * layouts entirely.
 */

import type { ApiContext } from '@mikata/kit/api';

export function GET(_ctx: ApiContext): Response {
  return Response.json({ ok: true, at: new Date().toISOString() });
}
