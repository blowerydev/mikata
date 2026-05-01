import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Feedback', section: 'UI', order: 7 };

const statusExample = await highlight(
  `import { Alert, Badge, Progress } from '@mikata/ui';

<Alert title="Build failed" color="red" variant="light">
  Fix the TypeScript errors and try again.
</Alert>

<Badge color="green" variant="light">Healthy</Badge>
<Progress value={72} label="72%" striped />`,
  'tsx',
);

const notificationExample = await highlight(
  `import { Notification, Loader, Skeleton } from '@mikata/ui';

<Notification title="Saved" color="green" withBorder>
  Project settings were updated.
</Notification>

<Loader size="sm" />
<Skeleton height={16} width="60%" />`,
  'tsx',
);

export default function Feedback() {
  useMeta({
    title: 'Feedback - @mikata/ui',
    description: 'Use @mikata/ui alerts, badges, loaders, progress, notifications, skeletons, and indicators.',
  });

  return (
    <article>
      <h1>Feedback</h1>
      <p>
        Feedback components communicate status without forcing navigation. Use
        them for validation summaries, async progress, transient confirmations,
        and loading placeholders.
      </p>

      <h2>Sub-groups</h2>
      <div class="component-map">
        <section class="component-group">
          <h3>Status</h3>
          <p>Persistent messages and compact status markers.</p>
          <div class="component-list">
            <code>Alert</code>
            <code>Badge</code>
            <code>Indicator</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Loading</h3>
          <p>Busy states, progress, and placeholders.</p>
          <div class="component-list">
            <code>Loader</code>
            <code>LoadingOverlay</code>
            <code>Progress</code>
            <code>RingProgress</code>
            <code>Skeleton</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Notifications</h3>
          <p>Short-lived or dismissible feedback near the edge of a workflow.</p>
          <div class="component-list">
            <code>Notification</code>
            <code>toast</code>
          </div>
        </section>
      </div>

      <h2>Status examples</h2>
      <CodeBlock html={statusExample} />

      <h2>Loading and notification examples</h2>
      <CodeBlock html={notificationExample} />

      <h2>Choosing feedback</h2>
      <table>
        <thead>
          <tr>
            <th>Situation</th>
            <th>Component</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Inline problem with a form or section</td>
            <td>
              <code>Alert</code>
            </td>
          </tr>
          <tr>
            <td>Small status next to text</td>
            <td>
              <code>Badge</code> or <code>Indicator</code>
            </td>
          </tr>
          <tr>
            <td>Known progress amount</td>
            <td>
              <code>Progress</code> or <code>RingProgress</code>
            </td>
          </tr>
          <tr>
            <td>Unknown loading duration</td>
            <td>
              <code>Loader</code>, <code>Skeleton</code>, or <code>LoadingOverlay</code>
            </td>
          </tr>
          <tr>
            <td>Transient success after an action</td>
            <td>
              <code>Notification</code> or <code>toast</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/ui/button">Button</Link> covers action states that often
          trigger feedback.
        </li>
        <li>
          <Link to="/ui/overlays">Overlays</Link> covers loading overlays and
          dialogs.
        </li>
      </ul>
    </article>
  );
}
