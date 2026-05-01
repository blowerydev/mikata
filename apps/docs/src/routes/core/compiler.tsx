import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'JSX & compiler', section: 'Core Concepts', order: 3 };

const viteSetup = await highlight(
  `import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';

export default defineConfig({
  plugins: [mikata()],
});`,
  'ts',
);

const tsSetup = await highlight(
  `{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "mikata"
  }
}`,
  'json',
);

const outputModel = await highlight(
  `<button class="counter" onClick={() => setCount(count() + 1)}>
  {count()}
</button>

// Compiles conceptually to:
const _tmpl = _template('<button class="counter"></button>');
const _el = _tmpl.cloneNode(true);
_delegate(_el, 'click', () => setCount(count() + 1));
renderEffect(() => _el.textContent = count());`,
  'tsx',
);

export default function Compiler() {
  useMeta({
    title: 'JSX & compiler - Mikata',
    description: 'How Mikata compiles JSX to direct DOM operations.',
  });

  return (
    <article>
      <h1>JSX &amp; compiler</h1>
      <p>
        Mikata JSX is compiled by <code>@mikata/compiler</code> before the
        browser sees it. Static markup becomes cached DOM templates. Dynamic
        expressions become small reactive bindings that update the exact node,
        attribute, or event listener that needs work.
      </p>

      <h2>Vite setup</h2>
      <p>
        Add the compiler plugin and let it handle TSX/JSX before Vite's normal
        esbuild JSX pass.
      </p>
      <CodeBlock html={viteSetup} />
      <CodeBlock html={tsSetup} />

      <h2>Output model</h2>
      <p>
        The compiler does not emit virtual DOM calls. Native elements compile
        to templates, components compile to component factories, and reactive
        expressions are wrapped in <code>renderEffect</code>.
      </p>
      <CodeBlock html={outputModel} />

      <h2>Supported JSX shape</h2>
      <ul>
        <li>Lowercase tags create DOM elements.</li>
        <li>Uppercase tags call components.</li>
        <li>Fragments compile to document fragments.</li>
        <li>Event props such as <code>onClick</code> attach native listeners.</li>
        <li>
          <code>class</code> accepts strings, arrays, and object maps.{' '}
          <code>style</code> accepts strings or objects.
        </li>
        <li>Spread props are supported and stay reactive through getters.</li>
      </ul>

      <h2>HMR</h2>
      <p>
        In dev server mode the plugin registers top-level component functions
        whose names start with an uppercase letter. When a module updates, the
        runtime can hot-replace those component factories without reloading the
        page. HMR is disabled for production builds.
      </p>

      <h2>Limitations</h2>
      <ul>
        <li>Namespaced JSX names are not supported.</li>
        <li>Component functions should return one DOM node or fragment.</li>
        <li>Component bodies are setup code; put changing reads in JSX or effects.</li>
        <li>Compiler output is an implementation detail, not a public API.</li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/core/runtime">Components &amp; JSX</Link> covers runtime
          semantics.
        </li>
        <li>
          <Link to="/tooling/compiler">Vite compiler</Link> tracks plugin
          options and debugging.
        </li>
      </ul>
    </article>
  );
}
