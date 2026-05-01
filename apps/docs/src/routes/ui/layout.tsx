import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Layout', section: 'UI', order: 3 };

const primitivesExample = await highlight(
  `import { Container, Stack, Group, Paper, Divider } from '@mikata/ui';

<Container size="lg">
  <Stack gap="lg">
    <Group justify="space-between" align="center">
      <h1>Projects</h1>
      <button>New project</button>
    </Group>

    <Paper withBorder padding="md">
      Project activity
    </Paper>

    <Divider />
  </Stack>
</Container>`,
  'tsx',
);

const shellExample = await highlight(
  `import { AppShell, ScrollArea } from '@mikata/ui';

<AppShell
  header={{ size: 56, children: <TopNav /> }}
  navbar={{ size: 260, children: <ScrollArea><Sidebar /></ScrollArea> }}
  padding="lg"
>
  <Dashboard />
</AppShell>`,
  'tsx',
);

export default function Layout() {
  useMeta({
    title: 'Layout - @mikata/ui',
    description: 'Compose pages with @mikata/ui layout primitives and app shells.',
  });

  return (
    <article>
      <h1>Layout</h1>
      <p>
        Layout components provide predictable spacing, alignment, page width,
        shells, and scroll containers. They do not own application state; use
        them to make repeated layouts consistent.
      </p>

      <h2>Sub-groups</h2>
      <div class="component-map">
        <section class="component-group">
          <h3>Spacing and alignment</h3>
          <p>Small primitives for rows, stacks, gaps, and centering.</p>
          <div class="component-list">
            <code>Stack</code>
            <code>Group</code>
            <code>Flex</code>
            <code>Center</code>
            <code>Space</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Page structure</h3>
          <p>Constrain content and build dashboard shells.</p>
          <div class="component-list">
            <code>Container</code>
            <code>AppShell</code>
            <code>Grid</code>
            <code>SimpleGrid</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Surfaces</h3>
          <p>Frame content without inventing one-off wrappers.</p>
          <div class="component-list">
            <code>Paper</code>
            <code>Divider</code>
            <code>ScrollArea</code>
            <code>AspectRatio</code>
          </div>
        </section>
      </div>

      <h2>Composition</h2>
      <CodeBlock html={primitivesExample} />

      <h2>App shell</h2>
      <p>
        <code>AppShell</code> reserves areas for header, navbar, aside, footer,
        and main content. Collapse sections from your own state when building
        responsive dashboards.
      </p>
      <CodeBlock html={shellExample} />

      <h2>Common props</h2>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Components</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>gap</code>
            </td>
            <td>
              <code>Stack</code>, <code>Group</code>, <code>Grid</code>
            </td>
            <td>Applies token-based spacing between children.</td>
          </tr>
          <tr>
            <td>
              <code>align</code> / <code>justify</code>
            </td>
            <td>
              <code>Stack</code>, <code>Group</code>, <code>Flex</code>
            </td>
            <td>Maps to CSS flex alignment values.</td>
          </tr>
          <tr>
            <td>
              <code>classNames</code>
            </td>
            <td>Components with internal parts.</td>
            <td>Targets stable slots for local styling.</td>
          </tr>
        </tbody>
      </table>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/ui/data-display">Data display</Link> covers the content
          blocks commonly placed inside layouts.
        </li>
        <li>
          <Link to="/ui/navigation">Navigation</Link> covers the controls often
          placed in shells.
        </li>
      </ul>
    </article>
  );
}
