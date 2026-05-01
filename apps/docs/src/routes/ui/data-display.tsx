import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Data display', section: 'UI', order: 8 };

const tableExample = await highlight(
  `import { Table } from '@mikata/ui';

<Table
  striped
  highlightOnHover
  columns={[
    { key: 'name', title: 'Name' },
    { key: 'status', title: 'Status' },
    { key: 'seats', title: 'Seats', align: 'right' },
  ]}
  data={[
    { name: 'Acme', status: 'Active', seats: 12 },
    { name: 'Globex', status: 'Trial', seats: 4 },
  ]}
/>`,
  'tsx',
);

const contentExample = await highlight(
  `import { Accordion, Avatar, Card, Timeline } from '@mikata/ui';

<Card withBorder header="Customer" footer="Updated today">
  <Avatar name="Ada Lovelace" color="blue" />
</Card>

<Accordion
  variant="contained"
  items={[
    { value: 'notes', label: 'Notes', content: 'Follow up next week.' },
  ]}
/>

<Timeline
  items={[
    { title: 'Created', description: 'Project opened' },
    { title: 'Reviewed', description: 'Ready for approval' },
  ]}
/>`,
  'tsx',
);

export default function DataDisplay() {
  useMeta({
    title: 'Data display - @mikata/ui',
    description: 'Use @mikata/ui tables, cards, avatars, accordions, images, timelines, trees, and virtual lists.',
  });

  return (
    <article>
      <h1>Data display</h1>
      <p>
        Data display components make records, media, and structured content easy
        to scan. Choose the component that matches the shape of the information,
        not only the visual style.
      </p>

      <h2>Sub-groups</h2>
      <div class="component-map">
        <section class="component-group">
          <h3>Records</h3>
          <p>Dense row-based data and very long lists.</p>
          <div class="component-list">
            <code>Table</code>
            <code>VirtualList</code>
            <code>Tree</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Content blocks</h3>
          <p>Framed content, expandable sections, and timelines.</p>
          <div class="component-list">
            <code>Card</code>
            <code>Accordion</code>
            <code>Timeline</code>
            <code>Spoiler</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Media and text helpers</h3>
          <p>Images, avatars, highlighted text, code, and keyboard labels.</p>
          <div class="component-list">
            <code>Avatar</code>
            <code>Image</code>
            <code>BackgroundImage</code>
            <code>Highlight</code>
            <code>Kbd</code>
            <code>Code</code>
          </div>
        </section>
      </div>

      <h2>Tables</h2>
      <p>
        Tables take column definitions and row data. Use <code>render</code> for
        custom cells and <code>align</code> for numeric or action columns.
      </p>
      <CodeBlock html={tableExample} />

      <h2>Content blocks</h2>
      <p>
        Cards, accordions, avatars, and timelines are good building blocks for
        detail pages and activity feeds.
      </p>
      <CodeBlock html={contentExample} />

      <h2>Choosing display components</h2>
      <table>
        <thead>
          <tr>
            <th>Need</th>
            <th>Component</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Compare many records by column</td>
            <td>
              <code>Table</code>
            </td>
          </tr>
          <tr>
            <td>Render thousands of same-height rows</td>
            <td>
              <code>VirtualList</code>
            </td>
          </tr>
          <tr>
            <td>Show one record with header/body/footer</td>
            <td>
              <code>Card</code>
            </td>
          </tr>
          <tr>
            <td>Represent nested items</td>
            <td>
              <code>Tree</code> or <code>Accordion</code>
            </td>
          </tr>
          <tr>
            <td>Show identity without an image</td>
            <td>
              <code>Avatar</code> with <code>name</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/ui/layout">Layout</Link> covers containers and surfaces for
          data display.
        </li>
        <li>
          <Link to="/state/queries">Queries &amp; mutations</Link> covers data
          fetching for records rendered in these components.
        </li>
      </ul>
    </article>
  );
}
