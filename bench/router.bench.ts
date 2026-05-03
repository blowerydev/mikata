import { bench, describe } from 'vitest';
import { matchRouteTree } from '../packages/router/src/matching';
import { normalizeRoutes } from '../packages/router/src/route-definition';
import { parseSearchParams } from '../packages/router/src/search-params';
import { searchParam } from '@mikata/router';

let sink: unknown;

function page() {
  return null as unknown as Node;
}

const routes = normalizeRoutes([
  { path: '/', component: page },
  {
    path: '/users',
    component: page,
    children: [
      { path: '/', component: page },
      { path: '/:id', component: page },
      {
        path: '/:id/posts',
        component: page,
        children: [
          { path: '/', component: page },
          { path: '/:postId', component: page },
          { path: '/:postId/comments/:commentId', component: page },
        ],
      },
    ],
  },
  {
    path: '/teams',
    component: page,
    children: Array.from({ length: 50 }, (_, index) => ({
      path: `/team-${index}`,
      component: page,
    })),
  },
  { path: '/files/*', component: page },
  { path: '/settings/profile', component: page },
]);

const paths = [
  '/',
  '/users',
  '/users/42',
  '/users/42/posts',
  '/users/42/posts/99',
  '/users/42/posts/99/comments/123',
  '/teams/team-0',
  '/teams/team-24',
  '/teams/team-49',
  '/files/a/b/c/d',
  '/settings/profile',
];

const query = '?page=5&q=compiler&showArchived=true&sort=updated&filters=%7B%22tag%22%3A%22core%22%7D';
const searchSchema = {
  page: searchParam.number(1),
  q: searchParam.string(''),
  showArchived: searchParam.boolean(false),
  sort: searchParam.enum(['created', 'updated', 'title'] as const, 'created'),
  filters: searchParam.json<{ tag: string }>({ tag: 'all' }),
};

describe('@mikata/router', () => {
  bench('match nested/static route set 1k times', () => {
    let matched = 0;
    for (let i = 0; i < 1_000; i++) {
      const result = matchRouteTree(paths[i % paths.length], routes);
      if (result) matched += result.length;
    }
    sink = matched;
  });

  bench('parse common search params schema 10k times', () => {
    let total = 0;
    for (let i = 0; i < 10_000; i++) {
      const result = parseSearchParams(query, searchSchema);
      total += result.page as number;
      total += (result.q as string).length;
      total += result.showArchived ? 1 : 0;
      total += (result.filters as { tag: string }).tag.length;
    }
    sink = total;
  });
});

void sink;
