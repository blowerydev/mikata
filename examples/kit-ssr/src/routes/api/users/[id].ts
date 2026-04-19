/**
 * Demo dynamic API route: `GET /api/users/:id`.
 *
 * Shows that API routes share the same path syntax as page routes —
 * `[id].ts` becomes `:id` in the URL pattern and the captured value
 * lands on `ctx.params.id`.
 */

import type { ApiContext } from '@mikata/kit/api';

const USERS: Record<string, { id: string; name: string; email: string }> = {
  '1': { id: '1', name: 'Ada Lovelace', email: 'ada@example.com' },
  '2': { id: '2', name: 'Alan Turing', email: 'alan@example.com' },
  '3': { id: '3', name: 'Grace Hopper', email: 'grace@example.com' },
};

export function GET(ctx: ApiContext): Response {
  const user = USERS[ctx.params.id!];
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(user);
}
