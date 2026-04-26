import { useMeta } from '@mikata/kit/head';
import { useParams } from '@mikata/router';

// Each entry feeds three things from one source: the SUMMARIES table
// (rendered into the page body), `getStaticPaths` (one prerendered URL
// per package), and `nav` (one sidebar link per package). Adding a
// package page = adding one row here.
const PACKAGES = [
  { slug: 'mikata', title: 'mikata', description: 'Umbrella package that re-exports the most commonly used Mikata APIs.' },
  { slug: 'reactivity', title: '@mikata/reactivity', description: 'Fine-grained signals, computed values, effects, and batching.' },
  { slug: 'runtime', title: '@mikata/runtime', description: 'JSX runtime, component model, control flow, and DOM helpers.' },
  { slug: 'compiler', title: '@mikata/compiler', description: 'Vite + Babel plugin compiling JSX to direct DOM operations.' },
  { slug: 'router', title: '@mikata/router', description: 'Client-side routing with nested layouts and typed params.' },
  { slug: 'kit', title: '@mikata/kit', description: 'Meta-framework: file-based routing, SSR, SSG, adapters.' },
  { slug: 'server', title: '@mikata/server', description: 'Server-side rendering with hydration payload serialization.' },
  { slug: 'store', title: '@mikata/store', description: 'Reactive stores, queries, mutations, tag-based invalidation.' },
  { slug: 'persist', title: '@mikata/persist', description: 'Storage-backed signals with cross-tab sync.' },
  { slug: 'form', title: '@mikata/form', description: 'Form state with zod/yup/valibot/superstruct/joi resolvers.' },
  { slug: 'i18n', title: '@mikata/i18n', description: 'Locale switching, ICU message formatting, reactive translations.' },
  { slug: 'ui', title: '@mikata/ui', description: '80+ accessible, themeable UI components.' },
  { slug: 'icons', title: '@mikata/icons', description: 'Icon system with Lucide and Tabler interop.' },
  { slug: 'testing', title: '@mikata/testing', description: 'Component testing utilities for Vitest.' },
  { slug: 'eslint-plugin', title: '@mikata/eslint-plugin', description: 'ESLint rules for Mikata setup-runs-once components.' },
  { slug: 'create-mikata', title: 'create-mikata', description: 'Scaffold a new Mikata app.' },
] as const;

// Array form: one nav entry per generated URL. The kit nav scanner
// inlines this list into the virtual:mikata-nav module - it must be a
// pure literal expression because the scanner evaluates it at build
// time without module scope.
export const nav = [
  { path: '/packages/mikata', title: 'mikata', section: 'Packages', order: 1 },
  { path: '/packages/reactivity', title: '@mikata/reactivity', section: 'Packages', order: 2 },
  { path: '/packages/runtime', title: '@mikata/runtime', section: 'Packages', order: 3 },
  { path: '/packages/compiler', title: '@mikata/compiler', section: 'Packages', order: 4 },
  { path: '/packages/router', title: '@mikata/router', section: 'Packages', order: 5 },
  { path: '/packages/kit', title: '@mikata/kit', section: 'Packages', order: 6 },
  { path: '/packages/server', title: '@mikata/server', section: 'Packages', order: 7 },
  { path: '/packages/store', title: '@mikata/store', section: 'Packages', order: 8 },
  { path: '/packages/persist', title: '@mikata/persist', section: 'Packages', order: 9 },
  { path: '/packages/form', title: '@mikata/form', section: 'Packages', order: 10 },
  { path: '/packages/i18n', title: '@mikata/i18n', section: 'Packages', order: 11 },
  { path: '/packages/ui', title: '@mikata/ui', section: 'Packages', order: 12 },
  { path: '/packages/icons', title: '@mikata/icons', section: 'Packages', order: 13 },
  { path: '/packages/testing', title: '@mikata/testing', section: 'Packages', order: 14 },
  { path: '/packages/eslint-plugin', title: '@mikata/eslint-plugin', section: 'Packages', order: 15 },
  { path: '/packages/create-mikata', title: 'create-mikata', section: 'Packages', order: 16 },
];

export async function getStaticPaths() {
  return PACKAGES.map((p) => ({ package: p.slug }));
}

const SUMMARIES: Record<string, { title: string; description: string }> =
  Object.fromEntries(PACKAGES.map((p) => [p.slug, { title: p.title, description: p.description }]));

export default function PackagePage() {
  const params = useParams<{ package: string }>();
  const info = () => SUMMARIES[params().package] ?? {
    title: params().package,
    description: 'Package documentation coming soon.',
  };

  useMeta({ title: () => `${info().title} - Package docs` });

  const sourceHref = () =>
    `https://github.com/blowerydev/mikata/tree/main/packages/${params().package}`;

  return (
    <article>
      <h1>{info().title}</h1>
      <p>{info().description}</p>
      <p>Package documentation is in progress.</p>
      <p>
        <a href={sourceHref()} target="_blank" rel="noreferrer">
          View source on GitHub &rarr;
        </a>
      </p>
    </article>
  );
}
