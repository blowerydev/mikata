import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Metadata & head', section: 'App Framework', order: 7 };

const metaExample = await highlight(
  `import { useMeta } from '@mikata/kit/head';

export default function ProductPage() {
  const product = useProduct();

  useMeta(() => ({
    title: \`\${product().name} - Acme\`,
    description: product().summary,
    meta: [{ property: 'og:type', content: 'product' }],
    link: [{ rel: 'canonical', href: \`/products/\${product().slug}\` }],
  }));

  return <h1>{product().name}</h1>;
}`,
  'tsx',
);

const viteExample = await highlight(
  `import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';
import { mikataKit } from '@mikata/kit';

export default defineConfig({
  plugins: [
    mikata(),
    mikataKit({
      css: ['/assets/app.css'],
      colorSchemeInit: true,
      preHydrate: ['/assets/pre-hydrate.js'],
    }),
  ],
});`,
  'ts',
);

export default function Metadata() {
  useMeta({
    title: 'Metadata and head - Mikata Kit',
    description: 'Manage document titles, meta tags, links, and pre-hydration scripts.',
  });

  return (
    <article>
      <h1>Metadata &amp; head</h1>
      <p>
        Kit provides a small head registry through <code>useMeta()</code>.
        Metadata is collected during SSR, written into prerendered HTML, and
        kept in sync on the client during navigation.
      </p>

      <h2>Route metadata</h2>
      <p>
        Call <code>useMeta()</code> inside a layout or page. Pass a plain object
        for static tags or a function when the tags should update from reactive
        state.
      </p>
      <CodeBlock html={metaExample} />

      <h2>Supported descriptors</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Output</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>title</code>
            </td>
            <td>Sets the document <code>&lt;title&gt;</code>.</td>
          </tr>
          <tr>
            <td>
              <code>description</code>
            </td>
            <td>Writes a <code>name="description"</code> meta tag.</td>
          </tr>
          <tr>
            <td>
              <code>meta</code>
            </td>
            <td>Writes custom meta tags such as Open Graph or robots.</td>
          </tr>
          <tr>
            <td>
              <code>link</code>
            </td>
            <td>Writes link tags such as canonical, preload, or alternate.</td>
          </tr>
        </tbody>
      </table>

      <h2>Deduplication</h2>
      <p>
        On the client, Kit owns tags marked with <code>data-mikata-head</code>.
        Titles, named meta tags, property meta tags, HTTP-equivalent meta tags,
        and canonical links are deduplicated so deeper pages can override layout
        defaults cleanly.
      </p>

      <h2>Pre-hydration assets</h2>
      <p>
        The Vite plugin can inject render-blocking styles, color-scheme
        initialization, and scripts that should run before hydration. Use this
        for tiny setup code that must affect the first paint.
      </p>
      <CodeBlock html={viteExample} />

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/layouts">Layouts</Link> shows how layout metadata
          combines with page metadata.
        </li>
        <li>
          <Link to="/app/ssr-ssg">SSR, SSG, adapters</Link> covers how head
          tags are spliced into rendered HTML.
        </li>
      </ul>
    </article>
  );
}
