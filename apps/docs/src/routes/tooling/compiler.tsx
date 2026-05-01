import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Vite compiler', section: 'Tooling', order: 2 };

const viteConfig = await highlight(
  `import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';

export default defineConfig({
  plugins: [mikata()],
});`,
  'ts',
);

const kitConfig = await highlight(
  `import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';
import { mikataKit } from '@mikata/kit';

export default defineConfig({
  plugins: [
    mikata(),
    mikataKit({
      prerender: true,
      css: '/src/styles.css',
    }),
  ],
});`,
  'ts',
);

const tsconfig = await highlight(
  `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "jsx": "preserve",
    "jsxImportSource": "mikata",
    "noEmit": true
  },
  "include": ["src"]
}`,
  'json',
);

export default function CompilerTooling() {
  useMeta({
    title: 'Vite compiler - Mikata tooling',
    description: 'Configure @mikata/compiler for JSX transforms, HMR, and Kit apps.',
  });

  return (
    <article>
      <h1>Vite compiler</h1>
      <p>
        <code>@mikata/compiler</code> is the Vite plugin that turns Mikata JSX
        into direct DOM operations. It preserves JSX from esbuild, runs the
        Mikata Babel transform, defines <code>__DEV__</code>, and injects
        component HMR boundaries in dev.
      </p>

      <h2>Basic Vite setup</h2>
      <CodeBlock html={viteConfig} />

      <h2>With Kit</h2>
      <p>
        Put <code>mikata()</code> before <code>mikataKit()</code>. The compiler
        handles JSX; Kit handles route scanning, manifests, SSR entries, and
        optional prerendering.
      </p>
      <CodeBlock html={kitConfig} />

      <h2>TypeScript setup</h2>
      <p>
        Keep JSX preserved so the compiler sees it. The scaffold uses
        <code>jsxImportSource: "mikata"</code> for umbrella-package apps and
        <code>@mikata/runtime</code> for focused Kit templates.
      </p>
      <CodeBlock html={tsconfig} />

      <h2>Options</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Default</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>dev</code>
            </td>
            <td>
              <code>true</code>
            </td>
            <td>Enables development diagnostics and sets <code>__DEV__</code>.</td>
          </tr>
          <tr>
            <td>
              <code>hmr</code>
            </td>
            <td>
              <code>true</code> in dev
            </td>
            <td>Registers top-level component functions for hot replacement.</td>
          </tr>
        </tbody>
      </table>

      <h2>Supported component shapes for HMR</h2>
      <p>
        HMR registration targets top-level components whose names start with an
        uppercase letter and are declared as function declarations or single
        function-valued variable declarations. Anonymous default exports still
        compile, but they are not hot-swapped as component boundaries.
      </p>

      <h2>Debugging compiler issues</h2>
      <ul>
        <li>Check that files use <code>.tsx</code> or <code>.jsx</code>.</li>
        <li>Check that <code>jsx</code> is set to <code>preserve</code>.</li>
        <li>Keep <code>mikata()</code> before plugins that expect transformed JSX.</li>
        <li>Use named top-level components when you want HMR to preserve state.</li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/core/compiler">Compiler concepts</Link> explains the JSX
          output model.
        </li>
        <li>
          <Link to="/packages/compiler">@mikata/compiler reference</Link> lists
          package exports.
        </li>
        <li>
          <Link to="/tooling/typescript">TypeScript</Link> covers JSX typing.
        </li>
      </ul>
    </article>
  );
}
