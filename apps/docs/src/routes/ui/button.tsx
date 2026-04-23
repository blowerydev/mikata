import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';
import { Playground, type PlaygroundControl } from '../../components/Playground';

const usage = await highlight(
  `import { Button } from '@mikata/ui';

<Button variant="primary" size="md" onClick={...}>
  Click me
</Button>`,
  'tsx',
);

const controls: PlaygroundControl[] = [
  { name: 'size', type: 'select', options: ['sm', 'md', 'lg'], default: 'md' },
  {
    name: 'variant',
    type: 'select',
    options: ['primary', 'outline', 'ghost'],
    default: 'primary',
  },
  { name: 'label', type: 'text', default: 'Click me' },
  { name: 'disabled', type: 'boolean', default: false },
];

export default function ButtonPage() {
  useMeta({ title: 'Button - @mikata/ui' });
  return (
    <article>
      <h1>Button</h1>
      <p>
        A clickable action. Variants cover the three hierarchy levels you
        reach for in most UIs; sizes map to the density of the
        surrounding layout.
      </p>

      <h2>Usage</h2>
      <CodeBlock html={usage} />

      <h2>Live demo</h2>
      <p>
        Tweak the controls below - the preview updates on every change.
        This page was server-rendered with default props; when the
        JavaScript loads, the playground hydrates and becomes interactive.
      </p>
      <Playground
        controls={controls}
        render={(props) => (
          <button
            class={`demo-btn demo-btn--${props.size} demo-btn--${props.variant}`}
            disabled={props.disabled as boolean}
          >
            {props.label as string}
          </button>
        )}
      />

      <h2>Props</h2>
      <ul>
        <li>
          <code>size</code> - <code>'sm' | 'md' | 'lg'</code>. Defaults to
          <code> 'md'</code>.
        </li>
        <li>
          <code>variant</code> -{' '}
          <code>'primary' | 'outline' | 'ghost'</code>. Defaults to
          <code> 'primary'</code>.
        </li>
        <li>
          <code>disabled</code> - <code>boolean</code>. Prevents click
          handlers from firing and applies a muted style.
        </li>
      </ul>
    </article>
  );
}
