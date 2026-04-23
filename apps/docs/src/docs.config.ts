/**
 * Sidebar + top-nav source of truth.
 *
 * Each section has a `title` (renders as a sidebar heading) and a list of
 * `pages`. Page `href` is a route path without the Vite base prefix - the
 * `<Link>` component adds the `/mikata/` prefix at render time.
 */
export interface DocsPage {
  title: string;
  href: string;
}

export interface DocsSection {
  title: string;
  pages: DocsPage[];
}

export const sections: DocsSection[] = [
  {
    title: 'Start',
    pages: [
      { title: 'Introduction', href: '/start/introduction' },
      { title: 'Install', href: '/start/install' },
      { title: 'Your first app', href: '/start/first-app' },
    ],
  },
  {
    title: 'Core',
    pages: [
      { title: 'Reactivity', href: '/core/reactivity' },
      { title: 'Runtime & JSX', href: '/core/runtime' },
    ],
  },
  {
    title: 'Routing & Data',
    pages: [{ title: 'Kit: file routes, loaders, SSR/SSG', href: '/routing/kit' }],
  },
  {
    title: 'UI',
    pages: [
      { title: 'Overview', href: '/ui/overview' },
      { title: 'Button', href: '/ui/button' },
    ],
  },
  {
    title: 'Reference',
    pages: [
      { title: '@mikata/reactivity', href: '/reference/reactivity' },
      { title: '@mikata/runtime', href: '/reference/runtime' },
      { title: '@mikata/kit', href: '/reference/kit' },
      { title: '@mikata/router', href: '/reference/router' },
      { title: '@mikata/server', href: '/reference/server' },
      { title: '@mikata/ui', href: '/reference/ui' },
      { title: '@mikata/store', href: '/reference/store' },
      { title: '@mikata/form', href: '/reference/form' },
      { title: '@mikata/i18n', href: '/reference/i18n' },
      { title: '@mikata/icons', href: '/reference/icons' },
      { title: '@mikata/persist', href: '/reference/persist' },
      { title: '@mikata/testing', href: '/reference/testing' },
      { title: '@mikata/eslint-plugin', href: '/reference/eslint-plugin' },
      { title: '@mikata/compiler', href: '/reference/compiler' },
    ],
  },
];

export const referencePackages = sections
  .find((s) => s.title === 'Reference')!
  .pages.map((p) => p.href.replace('/reference/', ''));
