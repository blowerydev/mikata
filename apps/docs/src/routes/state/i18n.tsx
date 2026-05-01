import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'i18n', section: 'State & Data', order: 4 };

const setupExample = await highlight(
  `import { createI18n, provideI18n } from '@mikata/i18n';

const messages = {
  en: {
    nav: { home: 'Home' },
    greeting: 'Hello {{name}}',
    inbox: {
      one: '{{count}} message',
      other: '{{count}} messages',
    },
  },
  fr: {
    nav: { home: 'Accueil' },
    greeting: 'Bonjour {{name}}',
    inbox: {
      one: '{{count}} message',
      other: '{{count}} messages',
    },
  },
};

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages,
  loader: (locale) => fetch(\`/i18n/\${locale}.json\`).then((r) => r.json()),
});

export function App() {
  provideI18n(i18n);
  return <Shell />;
}`,
  'tsx',
);

const usageExample = await highlight(
  `import { useI18n } from '@mikata/i18n';

export function Header() {
  const { t, fmt, locale, setLocale, loading } = useI18n<typeof messages.en>();

  return (
    <header>
      <a href="/">{t('nav.home')}</a>
      <p>{t('greeting', { name: 'Ada' })}</p>
      <p>{t.plural('inbox', 3)}</p>
      <p>{fmt.number(1234.5, { style: 'currency', currency: 'USD' })}</p>
      <button disabled={loading()} onClick={() => setLocale(locale() === 'en' ? 'fr' : 'en')}>
        {locale()}
      </button>
    </header>
  );
}`,
  'tsx',
);

const icuExample = await highlight(
  `const messages = {
  en: {
    updated: 'Updated {when, date, medium}',
    tasks: '{count, plural, =0 {No tasks} one {# task} other {# tasks}}',
    role: '{role, select, admin {Admin} editor {Editor} other {User}}',
  },
};`,
  'ts',
);

export default function I18n() {
  useMeta({
    title: 'i18n - @mikata/i18n',
    description: 'Localize Mikata apps with reactive locale state, translation helpers, ICU messages, and Intl formatters.',
  });

  return (
    <article>
      <h1>i18n</h1>
      <p>
        <code>@mikata/i18n</code> provides reactive locale state, typed dot-path
        translation keys, fallback dictionaries, async locale loading, plural
        helpers, and cached <code>Intl</code> formatters.
      </p>

      <h2>Create an instance</h2>
      <p>
        <code>createI18n()</code> accepts the initial locale, fallback locale,
        preloaded messages, and an optional loader. Locale switches wait for the
        loader before updating the reactive locale signal.
      </p>
      <CodeBlock html={setupExample} />

      <h2>Use translations</h2>
      <p>
        Provide the instance near the app root, then call <code>useI18n()</code>
        in descendant components. The returned <code>locale</code> and
        <code>loading</code> values are read signals.
      </p>
      <CodeBlock html={usageExample} />

      <table>
        <thead>
          <tr>
            <th>API</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>t(key, params)</code>
            </td>
            <td>Resolves a string key and interpolates values.</td>
          </tr>
          <tr>
            <td>
              <code>t.plural(key, count, params)</code>
            </td>
            <td>Chooses a plural category with <code>Intl.PluralRules</code>.</td>
          </tr>
          <tr>
            <td>
              <code>setLocale(locale)</code>
            </td>
            <td>Loads messages if needed, then updates the locale signal.</td>
          </tr>
          <tr>
            <td>
              <code>fmt</code>
            </td>
            <td>Locale-reactive number, date, relative time, and list formatters.</td>
          </tr>
        </tbody>
      </table>

      <h2>ICU messages</h2>
      <p>
        The default formatter supports a practical ICU subset:
        interpolation, number, date, time, plural, select, exact plural matches,
        and <code>#</code> inside plural arms. Pass a custom formatter when you
        need full ICU features such as <code>selectordinal</code>, offsets, or
        rich-text arms.
      </p>
      <CodeBlock html={icuExample} />

      <h2>Missing keys</h2>
      <p>
        Missing keys fall back to the fallback locale first. If the key is still
        missing, <code>onMissingKey</code> can return a custom string; otherwise
        development builds warn and return the key.
      </p>

      <h2>UI labels</h2>
      <p>
        Treat every user-facing label as data: navigation text, button labels,
        empty states, validation copy, table headings, ARIA labels, and toast
        messages. Keep keys stable and let components react to locale changes
        through <code>t()</code> and <code>fmt</code>.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/core/context">Context</Link> explains the provider model
          used by <code>provideI18n()</code>.
        </li>
        <li>
          <Link to="/state/persistence">Persistence</Link> shows how to store a
          preferred locale locally.
        </li>
      </ul>
    </article>
  );
}
