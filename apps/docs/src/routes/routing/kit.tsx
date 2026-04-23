import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';

const routeTree = await highlight(
  `src/routes/
  index.tsx            → /
  about.tsx            → /about
  users/
    _layout.tsx        → layout wrapping /users/*
    index.tsx          → /users
    [id].tsx           → /users/:id
  api/
    ping.ts            → /api/ping (API route)
  404.tsx              → not-found fallback`,
  'text',
);

const loaderExample = await highlight(
  `// src/routes/users/[id].tsx
import { useLoaderData, type LoadContext } from '@mikata/kit/loader';

export async function load({ params }: LoadContext) {
  const user = await db.users.find(params.id);
  return { user };
}

export default function UserPage() {
  const data = useLoaderData<typeof load>();
  return <h1>{data().user.name}</h1>;
}`,
  'tsx',
);

const viteConfig = await highlight(
  `import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';
import { mikataKit } from '@mikata/kit';

export default defineConfig({
  plugins: [
    mikata(),
    // Set prerender: true to emit static HTML during build.
    mikataKit({ prerender: true }),
  ],
});`,
  'ts',
);

const staticPaths = await highlight(
  `// src/routes/posts/[slug].tsx
export async function getStaticPaths() {
  const posts = await fs.readdir('content/posts');
  return posts.map((file) => ({
    params: { slug: file.replace(/\\.md$/, '') },
  }));
}

export async function load({ params }: LoadContext) {
  return { post: await fs.readFile(\`content/posts/\${params.slug}.md\`, 'utf8') };
}

export default function Post() { /* ... */ }`,
  'tsx',
);

export default function KitPage() {
  useMeta({ title: '@mikata/kit - Routing, loaders, SSR & SSG' });
  return (
    <article>
      <h1>@mikata/kit</h1>
      <p>
        Kit is the meta-framework layer: file-based routing, loaders for
        server-side data fetching, SSR, SSG, and adapters for Node and
        edge runtimes. One Vite plugin wires it all together.
      </p>

      <h2>File-based routing</h2>
      <p>
        Any <code>.tsx</code>/<code>.jsx</code>/<code>.mdx</code> file
        under <code>src/routes/</code> becomes a route. Dynamic segments
        are written as <code>[id].tsx</code>; catch-alls as{' '}
        <code>[...rest].tsx</code>; nested <code>_layout.tsx</code>
        {' '}files wrap their subtree.
      </p>
      <CodeBlock html={routeTree} />

      <h2>Loaders</h2>
      <p>
        A route can export a <code>load()</code> function that runs on
        the server for the initial request and on the client for
        subsequent navigations. Its return value is made available via
        <code> useLoaderData()</code>.
      </p>
      <CodeBlock html={loaderExample} />

      <h2>SSR and SSG</h2>
      <p>
        Server-render in dev and production with no extra setup - kit's
        Vite plugin installs the SSR middleware. Set{' '}
        <code>prerender: true</code> to emit static HTML at build time
        for every discoverable route; the output in{' '}
        <code>dist/static/</code> is ready for GitHub Pages, Netlify,
        Cloudflare Pages, or any static host.
      </p>
      <CodeBlock html={viteConfig} />
      <p>
        For parametric routes, export <code>getStaticPaths()</code> so
        the prerenderer knows which concrete URLs to render.
      </p>
      <CodeBlock html={staticPaths} />

      <h2>This site</h2>
      <p>
        This documentation site is a Mikata app. It's prerendered to
        static HTML, deployed to GitHub Pages, and hydrates to a live
        app on the client. The playground widgets on the{' '}
        <code>@mikata/ui</code> pages are interactive islands that wake
        up on load.
      </p>
    </article>
  );
}
