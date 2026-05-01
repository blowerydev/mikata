import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Overlays', section: 'UI', order: 5 };

const modalExample = await highlight(
  `import { Modal, Button, createDisclosure } from '@mikata/ui';

const modal = createDisclosure(false);

<Button onClick={modal.open}>Invite teammate</Button>
{modal.opened() && (
  <Modal title="Invite teammate" onClose={modal.close} centered>
    <InviteForm />
  </Modal>
)}`,
  'tsx',
);

const popoverExample = await highlight(
  `import { Button, Popover, Tooltip } from '@mikata/ui';

<Tooltip label="Copy link" position="top">
  <Button variant="subtle">Copy</Button>
</Tooltip>

<Popover
  target={<Button variant="outline">Filters</Button>}
  position="bottom"
  withArrow
>
  <FilterPanel />
</Popover>`,
  'tsx',
);

export default function Overlays() {
  useMeta({
    title: 'Overlays - @mikata/ui',
    description: 'Use @mikata/ui modals, drawers, popovers, tooltips, hover cards, overlays, and affix.',
  });

  return (
    <article>
      <h1>Overlays</h1>
      <p>
        Overlay components layer contextual content above the document. Use them
        for dialogs, drawers, anchored panels, floating help, and page-level
        blocking states.
      </p>

      <h2>Sub-groups</h2>
      <div class="component-map">
        <section class="component-group">
          <h3>Dialogs</h3>
          <p>Large interactions that need focus and dismissal behavior.</p>
          <div class="component-list">
            <code>Modal</code>
            <code>Drawer</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Anchored content</h3>
          <p>Small contextual layers tied to a trigger element.</p>
          <div class="component-list">
            <code>Popover</code>
            <code>Tooltip</code>
            <code>HoverCard</code>
            <code>Menu</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Page layers</h3>
          <p>Visual overlays and fixed-position content.</p>
          <div class="component-list">
            <code>Overlay</code>
            <code>LoadingOverlay</code>
            <code>Affix</code>
          </div>
        </section>
      </div>

      <h2>Dialog state</h2>
      <p>
        Keep open state outside the overlay. <code>Modal</code> and
        <code>Drawer</code> require <code>onClose</code> so escape, close
        buttons, and outside clicks can all request the same state transition.
      </p>
      <CodeBlock html={modalExample} />

      <h2>Anchored overlays</h2>
      <p>
        Tooltips wrap a trigger. Popovers receive a <code>target</code> node and
        dropdown children. Menus follow the same target-and-items pattern.
      </p>
      <CodeBlock html={popoverExample} />

      <h2>Behavior notes</h2>
      <table>
        <thead>
          <tr>
            <th>Concern</th>
            <th>Guidance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Focus</td>
            <td>Use dialogs for workflows that must hold focus until dismissed.</td>
          </tr>
          <tr>
            <td>Dismissal</td>
            <td>
              Wire <code>onClose</code> to the same state used by the trigger.
            </td>
          </tr>
          <tr>
            <td>Scroll lock</td>
            <td>Dialog components handle document-level locking internally.</td>
          </tr>
          <tr>
            <td>RTL</td>
            <td>
              Prefer drawer <code>'start'</code> and <code>'end'</code> positions
              for direction-aware layouts.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/ui/navigation">Navigation</Link> covers <code>Menu</code>
          and route-oriented controls.
        </li>
        <li>
          <Link to="/ui/feedback">Feedback</Link> covers loading overlays and
          notifications.
        </li>
      </ul>
    </article>
  );
}
