import type { ApiContext } from '@mikata/kit/api';

export async function GET(_ctx: ApiContext): Promise<Response> {
  return Response.json({ message: 'pong' });
}
