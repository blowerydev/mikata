import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';

export const nav = { title: 'Framework comparison', section: 'Core Concepts', order: 8 };

export default function FrameworkComparison() {
  useMeta({
    title: 'Framework comparison - Mikata',
    description: 'Compare Mikata with React, Solid, Svelte, Vue, and HTMX.',
  });

  return (
    <article>
      <h1>Framework comparison</h1>
      <p>
        Mikata sits in the fine-grained, compiled-leaning part of the UI
        landscape: JSX is compiled, components run once, and signals update
        DOM bindings directly. The comparison below is a mental-model guide,
        not a claim that one tool is best for every app.
      </p>

      <table>
        <thead>
          <tr>
            <th>Framework</th>
            <th>Similarities</th>
            <th>Main difference</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>React</td>
            <td>JSX, components, event handlers, ecosystem familiarity.</td>
            <td>
              React components re-render to produce new virtual trees. Mikata
              components run once and signals update the DOM bindings.
            </td>
          </tr>
          <tr>
            <td>Solid</td>
            <td>Signals, compiled JSX, fine-grained DOM updates.</td>
            <td>
              Mikata's package stack, Kit integration, and runtime APIs are its
              own; do not assume Solid helpers or conventions exist unchanged.
            </td>
          </tr>
          <tr>
            <td>Svelte</td>
            <td>Compile-time output, direct DOM updates, low runtime overhead.</td>
            <td>
              Svelte uses its own component syntax. Mikata keeps JSX and explicit
              signal reads.
            </td>
          </tr>
          <tr>
            <td>Vue</td>
            <td>Reactive state, templates/components, optional app framework patterns.</td>
            <td>
              Vue components participate in Vue's component update system.
              Mikata uses signal subscriptions and compiled JSX bindings.
            </td>
          </tr>
          <tr>
            <td>HTMX</td>
            <td>Can reduce client-side state for server-driven interfaces.</td>
            <td>
              HTMX treats the server as the primary UI engine. Mikata is for
              client-side interactivity with optional SSR through Kit.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Porting mental models</h2>
      <ul>
        <li>From React: stop expecting component bodies to re-run on state changes.</li>
        <li>From Solid: the signal shape will feel familiar, but check Mikata APIs by name.</li>
        <li>From Svelte: keep JSX expressions explicit instead of relying on assignment syntax.</li>
        <li>From Vue: provide/inject exists, but components are plain setup functions.</li>
        <li>From HTMX: use Mikata where the browser owns meaningful interactive state.</li>
      </ul>

      <h2>Choosing honestly</h2>
      <p>
        Choose Mikata when fine-grained updates, TypeScript JSX, and a modular
        package stack fit the project. Choose another ecosystem when its
        libraries, hiring pool, meta-framework conventions, or server-first
        model are the thing your product needs most.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/start/why-mikata">Why Mikata</Link> covers project fit and
          tradeoffs.
        </li>
        <li>
          <Link to="/core/runtime">Components &amp; JSX</Link> explains the
          run-once component model.
        </li>
      </ul>
    </article>
  );
}
