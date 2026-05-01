import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'TypeScript', section: 'Tooling', order: 5 };

const appTsconfig = await highlight(
  `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "jsx": "preserve",
    "jsxImportSource": "mikata",
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src"]
}`,
  'json',
);

const focusedTsconfig = await highlight(
  `{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@mikata/runtime"
  }
}`,
  'json',
);

const typedParams = await highlight(
  `import {
  useParams,
  useSearchParams,
  searchParam,
  type InferSearchSchema,
} from '@mikata/router';

const search = {
  page: searchParam.number(1),
  tab: searchParam.string('overview'),
};

export function UserPage() {
  const params = useParams<{ id: string }>();
  const [query] = useSearchParams<InferSearchSchema<typeof search>>();

  return <p>User {params().id}, page {query().page}</p>;
}`,
  'tsx',
);

const typedForm = await highlight(
  `import { createForm } from '@mikata/form';

type SignupValues = {
  email: string;
  plan: 'free' | 'pro';
};

const form = createForm<SignupValues>({
  initialValues: { email: '', plan: 'free' },
});`,
  'ts',
);

export default function TypeScriptTooling() {
  useMeta({
    title: 'TypeScript - Mikata tooling',
    description: 'Configure TypeScript for Mikata JSX, routes, signals, forms, and package imports.',
  });

  return (
    <article>
      <h1>TypeScript</h1>
      <p>
        Mikata is authored in TypeScript and expects the compiler to preserve
        JSX for <code>@mikata/compiler</code>. Most typing issues come from JSX
        config, signal reads, or choosing the right package import surface.
      </p>

      <h2>App tsconfig</h2>
      <p>
        This is the scaffold baseline for umbrella-package apps. The important
        parts are <code>moduleResolution: "bundler"</code>,
        <code>jsx: "preserve"</code>, and the JSX import source.
      </p>
      <CodeBlock html={appTsconfig} />

      <h2>Focused runtime import source</h2>
      <p>
        If a project does not install the umbrella <code>mikata</code> package,
        point JSX types at <code>@mikata/runtime</code> instead.
      </p>
      <CodeBlock html={focusedTsconfig} />

      <h2>Signals and props</h2>
      <ul>
        <li>Read signals by calling them: <code>count()</code>, not <code>count</code>.</li>
        <li>Keep props live by reading <code>props.value</code> inside reactive code.</li>
        <li>Use <code>ReadSignal&lt;T&gt;</code> when passing a read-only signal to helpers.</li>
        <li>Use setters for writes; do not reassign signal variables.</li>
      </ul>

      <h2>Typed route state</h2>
      <p>
        Path params are usually typed at the call site. Search params can be
        described with <code>searchParam</code> helpers and inferred through
        router types.
      </p>
      <CodeBlock html={typedParams} />

      <h2>Typed forms</h2>
      <p>
        Pass the values shape to <code>createForm</code> when you want field
        paths, submit handlers, and validation callbacks to share one model.
      </p>
      <CodeBlock html={typedForm} />

      <h2>Package import choices</h2>
      <table>
        <thead>
          <tr>
            <th>Use</th>
            <th>Import from</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Application examples and common APIs</td>
            <td>
              <code>mikata</code>
            </td>
          </tr>
          <tr>
            <td>Library code with explicit dependencies</td>
            <td>
              Focused packages such as <code>@mikata/reactivity</code>
            </td>
          </tr>
          <tr>
            <td>Kit Vite plugin</td>
            <td>
              <code>@mikata/kit</code>
            </td>
          </tr>
          <tr>
            <td>Client entry mounting</td>
            <td>
              <code>@mikata/kit/client</code>
            </td>
          </tr>
          <tr>
            <td>Server route rendering</td>
            <td>
              <code>@mikata/kit/server</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Common errors</h2>
      <table>
        <thead>
          <tr>
            <th>Symptom</th>
            <th>Fix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>JSX types are missing.</td>
            <td>Set <code>jsxImportSource</code> to <code>mikata</code> or <code>@mikata/runtime</code>.</td>
          </tr>
          <tr>
            <td>Vite/esbuild consumes JSX before Mikata.</td>
            <td>Set <code>jsx</code> to <code>preserve</code> and use the compiler plugin.</td>
          </tr>
          <tr>
            <td>DOM globals are missing.</td>
            <td>Add <code>DOM</code> and <code>DOM.Iterable</code> to <code>lib</code>.</td>
          </tr>
          <tr>
            <td>Vite globals are missing.</td>
            <td>Add <code>vite/client</code> to <code>types</code>.</td>
          </tr>
        </tbody>
      </table>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/tooling/compiler">Vite compiler</Link> covers the JSX
          transform.
        </li>
        <li>
          <Link to="/start/choosing-packages">Choosing packages</Link> explains
          umbrella and focused imports.
        </li>
        <li>
          <Link to="/core/reactivity">Reactivity</Link> explains signal types.
        </li>
      </ul>
    </article>
  );
}
