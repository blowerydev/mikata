import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Theming', section: 'UI', order: 2 };

const providerExample = await highlight(
  `import { ThemeProvider, createTheme, Button } from '@mikata/ui';
import '@mikata/ui/styles.css';

const theme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  components: {
    Button: { variant: 'light' },
  },
});

<ThemeProvider theme={theme} colorScheme="auto" direction="ltr">
  <Button>Save</Button>
</ThemeProvider>`,
  'tsx',
);

const documentExample = await highlight(
  `import { applyThemeToDocument } from '@mikata/ui';

applyThemeToDocument({
  scheme: 'auto',
  theme: {
    primaryColor: 'blue',
    other: { 'radius-sm': '0.375rem' },
  },
});`,
  'ts',
);

const customPalette = await highlight(
  `const theme = createTheme({
  colors: {
    brand: [
      '#eef8ff', '#d9efff', '#b9e1ff', '#8dccff', '#5eb5fb',
      '#389fed', '#2289d6', '#1972b4', '#185f94', '#174f7a',
    ],
  },
  primaryColor: 'brand',
});`,
  'ts',
);

export default function Theming() {
  useMeta({
    title: 'Theming - @mikata/ui',
    description: 'Configure @mikata/ui theme tokens, color schemes, direction, palettes, and component defaults.',
  });

  return (
    <article>
      <h1>Theming</h1>
      <p>
        The UI package is token-driven. <code>ThemeProvider</code> scopes theme
        variables to a subtree, while <code>applyThemeToDocument()</code> writes
        the same variables to <code>html</code> for whole-page apps.
      </p>

      <h2>Theme provider</h2>
      <p>
        Use <code>createTheme()</code> for structured overrides. Component
        defaults are read by components such as <code>Button</code>,
        <code>Alert</code>, and <code>TextInput</code> through the provider.
      </p>
      <CodeBlock html={providerExample} />

      <h2>Document theme</h2>
      <p>
        Use document theming before mounting or hydrating when page chrome needs
        the same light or dark tokens as the component tree.
      </p>
      <CodeBlock html={documentExample} />

      <h2>Core options</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>colorScheme</code>
            </td>
            <td>
              <code>'light'</code>, <code>'dark'</code>, or <code>'auto'</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>direction</code>
            </td>
            <td>
              Sets <code>'ltr'</code> or <code>'rtl'</code> and flows into logical components.
            </td>
          </tr>
          <tr>
            <td>
              <code>primaryColor</code>
            </td>
            <td>Names the palette used by primary components.</td>
          </tr>
          <tr>
            <td>
              <code>components</code>
            </td>
            <td>Sets per-component default props.</td>
          </tr>
          <tr>
            <td>
              <code>cssVariablesResolver</code>
            </td>
            <td>Injects custom variables from the active theme and scheme.</td>
          </tr>
        </tbody>
      </table>

      <h2>Custom palettes</h2>
      <p>
        Custom palettes contain ten shades. Colored components can use a custom
        palette by name anywhere a <code>MikataColor</code> is accepted.
      </p>
      <CodeBlock html={customPalette} />

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/ui/button">Button</Link> shows color, variant, size, and
          component defaults in a focused page.
        </li>
        <li>
          <Link to="/state/i18n">i18n</Link> covers translating user-facing UI
          labels.
        </li>
      </ul>
    </article>
  );
}
