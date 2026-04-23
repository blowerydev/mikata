import { useMeta } from '@mikata/kit/head';
import { useParams } from '@mikata/router';
import { referencePackages } from '../../docs.config';

export async function getStaticPaths() {
  return referencePackages.map((pkg) => ({ package: pkg }));
}

const SUMMARIES: Record<string, { title: string; description: string }> = {
  reactivity: {
    title: '@mikata/reactivity',
    description: 'Fine-grained signals, computed values, effects, and batching.',
  },
  runtime: {
    title: '@mikata/runtime',
    description: 'JSX runtime, component model, control flow, and DOM helpers.',
  },
  kit: {
    title: '@mikata/kit',
    description: 'Meta-framework: file-based routing, SSR, SSG, adapters.',
  },
  router: {
    title: '@mikata/router',
    description: 'Client-side routing with nested layouts and typed params.',
  },
  server: {
    title: '@mikata/server',
    description: 'Server-side rendering with hydration payload serialization.',
  },
  ui: {
    title: '@mikata/ui',
    description: '80+ accessible, themeable UI components.',
  },
  store: {
    title: '@mikata/store',
    description: 'Reactive stores, queries, mutations, tag-based invalidation.',
  },
  form: {
    title: '@mikata/form',
    description: 'Form state with zod/yup/valibot/superstruct/joi resolvers.',
  },
  i18n: {
    title: '@mikata/i18n',
    description: 'Locale switching, ICU message formatting, reactive translations.',
  },
  icons: {
    title: '@mikata/icons',
    description: 'Icon system with Lucide and Tabler interop.',
  },
  persist: {
    title: '@mikata/persist',
    description: 'Storage-backed signals with cross-tab sync.',
  },
  testing: {
    title: '@mikata/testing',
    description: 'Component testing utilities for Vitest.',
  },
  'eslint-plugin': {
    title: '@mikata/eslint-plugin',
    description: 'ESLint rules for Mikata setup-runs-once components.',
  },
  compiler: {
    title: '@mikata/compiler',
    description: 'Vite + Babel plugin compiling JSX to direct DOM operations.',
  },
};

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
