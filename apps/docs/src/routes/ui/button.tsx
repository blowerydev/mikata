import { useMeta } from '@mikata/kit/head';
import { Button } from '@mikata/ui';
import { CodeBlock, highlight } from '../../components/CodeBlock';
import { Playground, type PlaygroundControl } from '../../components/Playground';

export const nav = { title: 'Button', section: 'UI', order: 2 };

const usage = await highlight(
  `import { Button } from '@mikata/ui';

<Button variant="filled" size="md" onClick={...}>
  Click me
</Button>`,
  'tsx',
);

// `as const satisfies` preserves literal narrowing (so Playground's
// render callback sees `variant: 'filled' | 'outline' | ...` instead of
// `string`) while still enforcing the PlaygroundControl shape.
const controls = [
  { name: 'size', type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
  {
    name: 'variant',
    type: 'select',
    options: ['filled', 'outline', 'light', 'subtle', 'transparent'],
    default: 'filled',
  },
  { name: 'label', type: 'text', default: 'Click me' },
  { name: 'disabled', type: 'boolean', default: false },
  { name: 'loading', type: 'boolean', default: false },
] as const satisfies readonly PlaygroundControl[];

export default function ButtonPage() {
  useMeta({ title: 'Button - @mikata/ui' });
  return (
    <article>
      <h1>Button</h1>
      <p>
        A clickable action. Variants cover the hierarchy levels you
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
          // JSX, not `Button({...})`: the compiler wraps each attribute
          // in a getter, so Button's internal `props.size` etc. resolve
          // through those getters back to the reactive signals and
          // control changes update the button in place.
          <Button
            variant={props.variant}
            size={props.size}
            disabled={props.disabled}
            loading={props.loading}
          >
            {props.label}
          </Button>
        )}
      />

      <h2>Props</h2>
      <ul>
        <li>
          <code>variant</code> -{' '}
          <code>'filled' | 'outline' | 'light' | 'subtle' | 'transparent'</code>.
          Defaults to <code>'filled'</code>.
        </li>
        <li>
          <code>size</code> -{' '}
          <code>'xs' | 'sm' | 'md' | 'lg' | 'xl'</code>. Defaults to
          <code> 'md'</code>.
        </li>
        <li>
          <code>disabled</code> - <code>boolean</code>. Prevents click
          handlers from firing and applies a muted style.
        </li>
        <li>
          <code>loading</code> - <code>boolean</code>. Shows a spinner in
          place of the children and disables the button.
        </li>
      </ul>
    </article>
  );
}
