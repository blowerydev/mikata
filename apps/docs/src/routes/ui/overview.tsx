import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'UI overview', section: 'UI', order: 1 };

const setupExample = await highlight(
  `import { ThemeProvider, Button, TextInput } from '@mikata/ui';
import '@mikata/ui/styles.css';

export function App() {
  return (
    <ThemeProvider>
      <TextInput label="Email" type="email" />
      <Button color="primary">Sign up</Button>
    </ThemeProvider>
  );
}`,
  'tsx',
);

const documentThemeExample = await highlight(
  `import { applyThemeToDocument } from '@mikata/ui';
import { signal } from 'mikata';

const [scheme, setScheme] = signal<'light' | 'dark' | 'auto'>('auto');

applyThemeToDocument({ scheme });`,
  'ts',
);

const groups = [
  {
    title: 'Layout',
    href: '/ui/layout',
    description: 'Structure pages and align content.',
    components: ['Box', 'Stack', 'Group', 'Grid', 'Flex', 'AppShell'],
  },
  {
    title: 'Inputs',
    href: '/ui/inputs',
    description: 'Collect and validate user input.',
    components: ['TextInput', 'Select', 'Checkbox', 'Slider', 'DateInput'],
  },
  {
    title: 'Feedback',
    href: '/ui/feedback',
    description: 'Show status, progress, and short-lived messages.',
    components: ['Alert', 'Badge', 'Loader', 'Progress', 'Notification'],
  },
  {
    title: 'Data display',
    href: '/ui/data-display',
    description: 'Present records, media, and dense content.',
    components: ['Table', 'Card', 'Avatar', 'Accordion', 'VirtualList'],
  },
  {
    title: 'Navigation',
    href: '/ui/navigation',
    description: 'Move between views and local panels.',
    components: ['Tabs', 'Menu', 'Pagination', 'Breadcrumb', 'Stepper'],
  },
  {
    title: 'Overlays',
    href: '/ui/overlays',
    description: 'Layer contextual content above the page.',
    components: ['Modal', 'Drawer', 'Popover', 'Tooltip', 'HoverCard'],
  },
  {
    title: 'Actions',
    href: '/ui/button',
    description: 'Trigger actions at different emphasis levels.',
    components: ['Button', 'ActionIcon', 'CloseButton', 'ButtonGroup'],
  },
  {
    title: 'Theming',
    href: '/ui/theming',
    description: 'Configure tokens, schemes, direction, and defaults.',
    components: ['ThemeProvider', 'createTheme', 'applyThemeToDocument'],
  },
];

export default function UIOverview() {
  useMeta({
    title: '@mikata/ui - Component library',
    description: 'Set up @mikata/ui, understand component sub-groups, and find the right page.',
  });

  return (
    <article>
      <h1>@mikata/ui</h1>
      <p>
        <code>@mikata/ui</code> is the component layer for Mikata apps:
        accessible primitives, form controls, layout helpers, overlays, data
        display widgets, and theme tokens that share the same prop conventions.
      </p>

      <h2>Setup</h2>
      <p>
        Import the stylesheet once, then wrap app UI in <code>ThemeProvider</code>
        when you want scoped theme values, component defaults, or direction.
      </p>
      <CodeBlock html={setupExample} />

      <h2>Whole-document theme</h2>
      <p>
        Use <code>applyThemeToDocument()</code> at app bootstrap when
        <code>html</code> and <code>body</code> need the same color-scheme
        tokens as the component tree. This is the usual choice for SSR and SSG
        apps to avoid a first-paint mismatch.
      </p>
      <CodeBlock html={documentThemeExample} />

      <h2>Component groups</h2>
      <p>
        The UI docs are grouped by workflow rather than alphabetically. Category
        pages list the relevant components, shared props, accessibility notes,
        and examples. Detail pages such as <Link to="/ui/button">Button</Link>
        are linked from those groups when a component needs a deeper playground
        and props table.
      </p>

      <div class="component-map">
        {groups.map((group) => (
          <section class="component-group">
            <h3>
              <Link to={group.href}>{group.title}</Link>
            </h3>
            <p>{group.description}</p>
            <div class="component-list">
              {group.components.map((component) => (
                <code>{component}</code>
              ))}
            </div>
          </section>
        ))}
      </div>

      <h2>Component page pattern</h2>
      <p>
        Component pages should keep examples, playground controls, and props
        reference separate. Playground demos render the component in a preview
        area with prop controls in a right-side panel on desktop, then stack the
        controls below the preview on smaller screens.
      </p>
    </article>
  );
}
