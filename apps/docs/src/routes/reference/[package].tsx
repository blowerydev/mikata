import { useMeta } from '@mikata/kit/head';
import { useParams } from '@mikata/router';

// Each entry feeds three things from one source: the SUMMARIES table
// (rendered into the page body), `getStaticPaths` (one prerendered URL
// per package), and `nav` (one sidebar link per package). Adding a
// reference page = adding one row here.
const PACKAGES = [
  { slug: 'reactivity', title: '@mikata/reactivity', description: 'Fine-grained signals, computed values, effects, and batching.' },
  { slug: 'runtime', title: '@mikata/runtime', description: 'JSX runtime, component model, control flow, and DOM helpers.' },
  { slug: 'kit', title: '@mikata/kit', description: 'Meta-framework: file-based routing, SSR, SSG, adapters.' },
  { slug: 'router', title: '@mikata/router', description: 'Client-side routing with nested layouts and typed params.' },
  { slug: 'server', title: '@mikata/server', description: 'Server-side rendering with hydration payload serialization.' },
  { slug: 'ui', title: '@mikata/ui', description: '80+ accessible, themeable UI components.' },
  { slug: 'store', title: '@mikata/store', description: 'Reactive stores, queries, mutations, tag-based invalidation.' },
  { slug: 'form', title: '@mikata/form', description: 'Form state with zod/yup/valibot/superstruct/joi resolvers.' },
  { slug: 'i18n', title: '@mikata/i18n', description: 'Locale switching, ICU message formatting, reactive translations.' },
  { slug: 'icons', title: '@mikata/icons', description: 'Icon system with Lucide and Tabler interop.' },
  { slug: 'persist', title: '@mikata/persist', description: 'Storage-backed signals with cross-tab sync.' },
  { slug: 'testing', title: '@mikata/testing', description: 'Component testing utilities for Vitest.' },
  { slug: 'eslint-plugin', title: '@mikata/eslint-plugin', description: 'ESLint rules for Mikata setup-runs-once components.' },
  { slug: 'compiler', title: '@mikata/compiler', description: 'Vite + Babel plugin compiling JSX to direct DOM operations.' },
] as const;

// Array form: one nav entry per generated URL. The kit nav scanner
// inlines this list into the virtual:mikata-nav module - it must be a
// pure literal expression because the scanner evaluates it at build
// time without module scope.
export const nav = [
  { path: '/reference/reactivity', title: '@mikata/reactivity', section: 'Reference', order: 1 },
  { path: '/reference/runtime', title: '@mikata/runtime', section: 'Reference', order: 2 },
  { path: '/reference/kit', title: '@mikata/kit', section: 'Reference', order: 3 },
  { path: '/reference/router', title: '@mikata/router', section: 'Reference', order: 4 },
  { path: '/reference/server', title: '@mikata/server', section: 'Reference', order: 5 },
  { path: '/reference/ui', title: '@mikata/ui', section: 'Reference', order: 6 },
  { path: '/reference/store', title: '@mikata/store', section: 'Reference', order: 7 },
  { path: '/reference/form', title: '@mikata/form', section: 'Reference', order: 8 },
  { path: '/reference/i18n', title: '@mikata/i18n', section: 'Reference', order: 9 },
  { path: '/reference/icons', title: '@mikata/icons', section: 'Reference', order: 10 },
  { path: '/reference/persist', title: '@mikata/persist', section: 'Reference', order: 11 },
  { path: '/reference/testing', title: '@mikata/testing', section: 'Reference', order: 12 },
  { path: '/reference/eslint-plugin', title: '@mikata/eslint-plugin', section: 'Reference', order: 13 },
  { path: '/reference/compiler', title: '@mikata/compiler', section: 'Reference', order: 14 },
];

export async function getStaticPaths() {
  return PACKAGES.map((p) => ({ package: p.slug }));
}

const SUMMARIES: Record<string, { title: string; description: string }> =
  Object.fromEntries(PACKAGES.map((p) => [p.slug, { title: p.title, description: p.description }]));

export default function ReferencePage() {
  const params = useParams<{ package: string }>();
  const info = () => SUMMARIES[params().package] ?? {
    title: params().package,
    description: 'Reference documentation coming soon.',
  };

  useMeta({ title: () => `${info().title} - API reference` });

  const sourceHref = () =>
    `https://github.com/blowerydev/mikata/tree/main/packages/${params().package}`;

  return (
    <article>
      <h1>{info().title}</h1>
      <p>{info().description}</p>
      <p>Full API reference is in progress.</p>
      <p>
        <a href={sourceHref()} target="_blank" rel="noreferrer">
          View source on GitHub →
        </a>
      </p>
    </article>
  );
}
