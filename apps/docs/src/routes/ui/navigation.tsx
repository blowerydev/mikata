import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Navigation', section: 'UI', order: 6 };

const tabsExample = await highlight(
  `import { Tabs } from '@mikata/ui';

<Tabs
  defaultValue="activity"
  items={[
    { value: 'activity', label: 'Activity', content: <Activity /> },
    { value: 'settings', label: 'Settings', content: <Settings /> },
  ]}
/>`,
  'tsx',
);

const menuExample = await highlight(
  `import { Button, Menu, Pagination } from '@mikata/ui';

<Menu
  target={<Button variant="outline">Actions</Button>}
  items={[
    { type: 'label', label: 'Project' },
    { label: 'Rename', onClick: rename },
    { label: 'Archive', color: 'red', onClick: archive },
  ]}
/>

<Pagination total={12} defaultValue={1} onChange={setPage} />`,
  'tsx',
);

export default function Navigation() {
  useMeta({
    title: 'Navigation - @mikata/ui',
    description: 'Use @mikata/ui tabs, menus, pagination, breadcrumbs, nav links, segmented controls, and steppers.',
  });

  return (
    <article>
      <h1>Navigation</h1>
      <p>
        Navigation components move users between routes, pages, records, and
        local panels. They should reflect current state clearly and keep labels
        short enough to scan.
      </p>

      <h2>Sub-groups</h2>
      <div class="component-map">
        <section class="component-group">
          <h3>Local views</h3>
          <p>Switch content inside the current page.</p>
          <div class="component-list">
            <code>Tabs</code>
            <code>SegmentedControl</code>
            <code>Stepper</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Route and record navigation</h3>
          <p>Represent location, hierarchy, and page ranges.</p>
          <div class="component-list">
            <code>NavLink</code>
            <code>Breadcrumb</code>
            <code>Pagination</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Commands</h3>
          <p>Open compact action lists from a trigger.</p>
          <div class="component-list">
            <code>Menu</code>
          </div>
        </section>
      </div>

      <h2>Tabs</h2>
      <p>
        Tabs accept an item list with stable <code>value</code> keys. Use
        controlled <code>value</code> when route state owns the active tab.
      </p>
      <CodeBlock html={tabsExample} />

      <h2>Menus and pages</h2>
      <p>
        Menus use a target node and item definitions. Pagination exposes
        controlled and default page modes for table and list views.
      </p>
      <CodeBlock html={menuExample} />

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
              <code>value</code> / <code>defaultValue</code>
            </td>
            <td>
              <code>Tabs</code>, <code>SegmentedControl</code>, <code>Pagination</code>
            </td>
            <td>Controlled or initial active value.</td>
          </tr>
          <tr>
            <td>
              <code>items</code>
            </td>
            <td>
              <code>Tabs</code>, <code>Menu</code>
            </td>
            <td>Declarative list of visible options.</td>
          </tr>
          <tr>
            <td>
              <code>onChange</code>
            </td>
            <td>Stateful navigation controls.</td>
            <td>Reports active tab, segment, step, or page changes.</td>
          </tr>
        </tbody>
      </table>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/file-routes">File routes</Link> covers app-level
          routing.
        </li>
        <li>
          <Link to="/ui/layout">Layout</Link> covers shells that hold navigation.
        </li>
      </ul>
    </article>
  );
}
