import { describe, it, expect } from 'vitest';
import { renderToString } from '@mikata/server';

// SSR smoke tests for the @mikata/ui surface.
//
// Goal: each component's top-level evaluation AND a one-shot render
// under the server DOM shim should complete without throwing. Shim
// gaps — missing globals (rAF, matchMedia, IntersectionObserver),
// missing Element methods (dataset, replaceChildren), missing node
// classes — surface here as ReferenceError / TypeError, exactly the
// class of bug that had me reactively patching the shim during the
// docs-app session.
//
// Not exhaustive coverage of every component prop combination — just
// "it loads, it renders once, it doesn't blow up the shim".

describe('@mikata/ui SSR surface', () => {
  const cases: Array<[string, () => Promise<unknown>]> = [
    // Layout primitives - commonly composed, break-prone shim paths
    // around dataset/style.setProperty.
    ['Button', async () => {
      const { Button } = await import('../src/components/Button');
      return renderToString(() => Button({ children: 'go' }));
    }],
    ['Text', async () => {
      const { Text } = await import('../src/components/Text');
      return renderToString(() => Text({ children: 'hi' }));
    }],
    ['Title', async () => {
      const { Title } = await import('../src/components/Title');
      return renderToString(() => Title({ order: 1, children: 'Hi' }));
    }],
    ['Stack', async () => {
      const { Stack } = await import('../src/components/Stack');
      return renderToString(() => Stack({ gap: 'md' }));
    }],
    ['Group', async () => {
      const { Group } = await import('../src/components/Group');
      return renderToString(() => Group({ gap: 'sm' }));
    }],
    ['Divider', async () => {
      const { Divider } = await import('../src/components/Divider');
      return renderToString(() => Divider({}));
    }],

    // Form inputs — exercise event delegation + dataset + bindings.
    ['TextInput', async () => {
      const { TextInput } = await import('../src/components/TextInput');
      return renderToString(() => TextInput({ label: 'name' }));
    }],
    ['Textarea', async () => {
      const { Textarea } = await import('../src/components/Textarea');
      return renderToString(() => Textarea({ label: 'bio' }));
    }],
    ['NumberInput', async () => {
      const { NumberInput } = await import('../src/components/NumberInput');
      return renderToString(() => NumberInput({ label: 'age' }));
    }],
    ['Checkbox', async () => {
      const { Checkbox } = await import('../src/components/Checkbox');
      return renderToString(() => Checkbox({ label: 'agree' }));
    }],
    ['Switch', async () => {
      const { Switch } = await import('../src/components/Switch');
      return renderToString(() => Switch({ label: 'on' }));
    }],
    ['Radio', async () => {
      const { Radio } = await import('../src/components/Radio');
      return renderToString(() => Radio({ label: 'a', value: 'a' }));
    }],
    ['Select', async () => {
      const { Select } = await import('../src/components/Select');
      return renderToString(() =>
        Select({ label: 'fruit', data: ['apple', 'pear'] }),
      );
    }],

    // Feedback / status — rAF-adjacent in dev warn paths.
    ['Alert', async () => {
      const { Alert } = await import('../src/components/Alert');
      return renderToString(() => Alert({ children: 'heads up' }));
    }],
    ['Badge', async () => {
      const { Badge } = await import('../src/components/Badge');
      return renderToString(() => Badge({ children: 'new' }));
    }],
    ['Loader', async () => {
      const { Loader } = await import('../src/components/Loader');
      return renderToString(() => Loader({}));
    }],
    ['Progress', async () => {
      const { Progress } = await import('../src/components/Progress');
      return renderToString(() => Progress({ value: 50 }));
    }],
    ['Skeleton', async () => {
      const { Skeleton } = await import('../src/components/Skeleton');
      return renderToString(() => Skeleton({ height: 20 }));
    }],

    // Surfaces / containers — test scroll-lock and portal-adjacent
    // shim stubs stay no-ops on the server instead of throwing. These
    // components' imperative appendChild call expects a Node, not a
    // string, so we build one explicitly.
    ['Card', async () => {
      const { Card } = await import('../src/components/Card');
      return renderToString(() => Card({ children: document.createTextNode('c') as unknown as Node }));
    }],
    ['Paper', async () => {
      const { Paper } = await import('../src/components/Paper');
      return renderToString(() => Paper({ children: document.createTextNode('p') as unknown as Node }));
    }],
    ['Container', async () => {
      const { Container } = await import('../src/components/Container');
      return renderToString(() => Container({ children: document.createTextNode('c') as unknown as Node }));
    }],

    // Theme / provider — the one that broke in the docs session.
    ['ThemeProvider', async () => {
      const { ThemeProvider } = await import('../src/theme');
      return renderToString(() => ThemeProvider({}));
    }],
  ];

  for (const [name, fn] of cases) {
    it(`${name} renders under the server DOM shim`, async () => {
      const result = (await fn()) as { html: string };
      // `html` must be a non-empty string — an empty result would mean
      // the component returned null or the shim swallowed output.
      expect(result.html.length).toBeGreaterThan(0);
    });
  }
});
