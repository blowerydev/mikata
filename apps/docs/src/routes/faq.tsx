import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';

export const nav = { title: 'FAQ', section: 'FAQ', order: 1 };

export default function FAQ() {
  useMeta({
    title: 'FAQ - Mikata',
    description: 'Answers to common questions about Mikata, signals, SSR, styling, forms, and production readiness.',
  });

  return (
    <article>
      <h1>FAQ</h1>
      <p>
        Short answers to the questions people usually ask when they are
        deciding whether Mikata fits an app, a team, or an experiment.
      </p>

      <h2>Does Mikata use a virtual DOM?</h2>
      <p>
        No. Mikata compiles JSX to DOM operations and wires reactive reads to
        the exact places that need updates. Component functions run once when
        mounted; signal writes update subscribed text nodes, attributes, event
        handlers, or control-flow regions without diffing a virtual tree.
      </p>

      <h2>How do signals work?</h2>
      <p>
        A signal is a getter/setter pair. Calling the getter inside a computed
        value, effect, or JSX binding records the dependency. Calling the
        setter schedules the smallest affected work. Start with
        {' '}
        <Link to="/core/reactivity">Reactivity</Link>, then read
        {' '}
        <Link to="/core/runtime">Components &amp; JSX</Link> for how those
        reads map into rendered DOM.
      </p>

      <h2>Can Mikata render on the server?</h2>
      <p>
        Yes. <code>@mikata/kit</code> supports SSR, prerendered static pages,
        and adapters for Node or edge-style runtimes. Use
        {' '}
        <Link to="/app/ssr-ssg">SSR, SSG, adapters</Link> for rendering modes
        and <Link to="/app/deployment">Deployment</Link> for host choices.
      </p>

      <h2>How mature is the ecosystem?</h2>
      <p>
        Mikata is a small, repo-owned ecosystem rather than a broad third-party
        marketplace. The core packages cover rendering, routing, Kit, forms,
        persistence, i18n, UI components, testing, TypeScript, and linting. If
        you need a large plugin ecosystem today, check that your required
        integrations are easy to wrap before committing.
      </p>

      <h2>Which browsers are supported?</h2>
      <p>
        The docs and starter templates target modern evergreen browsers. The
        compiler emits normal browser JavaScript and the docs build targets
        ESNext so route modules can use top-level <code>await</code> for
        build-time code highlighting. For older browser requirements, lower
        the Vite target and test the specific runtime APIs your app uses.
      </p>

      <h2>How is Mikata different from React?</h2>
      <p>
        Both use JSX and components, but the update model is different. React
        re-runs component functions and reconciles new virtual output. Mikata
        runs component functions once, then signals update the DOM bindings
        that read them. The
        {' '}
        <Link to="/core/framework-comparison">framework comparison</Link>
        {' '}
        page gives a broader comparison with React, Solid, Svelte, Vue, and
        HTMX.
      </p>

      <h2>What should I use for forms?</h2>
      <p>
        Use native inputs and <code>model</code> for very small forms. Use
        <code>@mikata/form</code> when you need validation, field state,
        submit lifecycle, or field arrays. In Kit apps, pair forms with
        actions for progressive enhancement and server-side mutation handling.
      </p>

      <h2>How should I style an app?</h2>
      <p>
        You can use plain CSS, CSS modules through your Vite setup, or the
        component and token system in <code>@mikata/ui</code>. The UI package
        ships theme providers, document theme application, layout primitives,
        inputs, overlays, navigation, feedback, and data-display components.
      </p>

      <h2>Is Mikata production ready?</h2>
      <p>
        Treat it like an intentionally small framework: good for teams that
        value fine-grained updates, compiled JSX, and a cohesive package stack,
        but still worth validating against your app's deployment target,
        accessibility needs, browser matrix, and integration list. The release
        path through these docs is designed to make those checks explicit.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/start/why-mikata">Why Mikata</Link> covers tradeoffs and
          project fit.
        </li>
        <li>
          <Link to="/start/create-project">Create a project</Link> gets a
          starter running.
        </li>
        <li>
          <Link to="/packages/mikata">Package reference</Link> lists the
          public packages and entry points.
        </li>
      </ul>
    </article>
  );
}
