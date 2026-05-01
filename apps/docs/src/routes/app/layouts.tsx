import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Layouts', section: 'App Framework', order: 3 };

const layoutExample = await highlight(
  `// src/routes/_layout.tsx
import { routeOutlet } from '@mikata/router';

export default function RootLayout() {
  return (
    <>
      <header>Acme</header>
      <main>{routeOutlet()}</main>
    </>
  );
}`,
  'tsx',
);

const nestedTree = await highlight(
  `src/routes/
  _layout.tsx          wraps every page
  dashboard/
    _layout.tsx        wraps /dashboard/*
    index.tsx          /dashboard
    settings.tsx       /dashboard/settings`,
  'text',
);

const metaExample = await highlight(
  `// src/routes/dashboard/_layout.tsx
import { useMeta } from '@mikata/kit/head';
import { routeOutlet } from '@mikata/router';

export default function DashboardLayout() {
  useMeta({
    title: 'Dashboard - Acme',
    meta: [{ name: 'robots', content: 'noindex' }],
  });

  return <section class="dashboard">{routeOutlet()}</section>;
}`,
  'tsx',
);

export default function Layouts() {
  useMeta({
    title: 'Layouts - Mikata Kit',
    description: 'Use _layout routes to wrap Mikata Kit page subtrees.',
  });

  return (
    <article>
      <h1>Layouts</h1>
      <p>
        A <code>_layout.tsx</code> file wraps every matching child route in its
        folder. Layouts are ordinary Mikata components, so they can provide
        context, render navigation, register metadata, and keep persistent UI
        around the active page.
      </p>

      <h2>Root layout</h2>
      <p>
        Render <code>routeOutlet()</code> where the matched child page should
        appear. The root layout is the usual place for app chrome, providers,
        global navigation, and shell-level error boundaries.
      </p>
      <CodeBlock html={layoutExample} />

      <h2>Nested layouts</h2>
      <p>
        Layouts compose from parent to child. In this tree, requests for
        <code>/dashboard/settings</code> render the root layout, then the
        dashboard layout, then the settings page.
      </p>
      <CodeBlock html={nestedTree} />

      <h2>Metadata in layouts</h2>
      <p>
        <code>useMeta()</code> works in layouts and pages. Parent tags remain
        active while the layout is mounted, and child pages can override
        deduplicated tags such as <code>title</code>, descriptions, and
        canonical links.
      </p>
      <CodeBlock html={metaExample} />

      <h2>Layout boundaries</h2>
      <ul>
        <li>Layouts are route modules, so they can use imports shared by their subtree.</li>
        <li>Files named <code>_layout</code> do not create standalone URLs.</li>
        <li>Layout loaders are supported because layouts participate in route matching.</li>
        <li>Use colocated <code>_helpers.ts</code> files for non-route utilities.</li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/loaders">Loaders</Link> explains how matched layouts
          and pages receive data.
        </li>
        <li>
          <Link to="/app/metadata">Metadata &amp; head</Link> covers the head
          registry used by layouts and pages.
        </li>
      </ul>
    </article>
  );
}
