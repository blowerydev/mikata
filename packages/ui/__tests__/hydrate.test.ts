import { describe, it, expect } from 'vitest';
import { signal, flushSync } from '@mikata/reactivity';
import { hydrate } from '@mikata/runtime';
import { renderToString } from '@mikata/server';

/**
 * Hydration round-trip tests for @mikata/ui components.
 *
 * Contract: the server's output, when re-parsed into a jsdom container
 * and handed to `hydrate()` with the same component factory, produces
 * the SAME nodes (identity-checked with `toBe`). If the component
 * re-creates its root during hydration, the captured server references
 * stop matching and the tests fail.
 *
 * Also: reactive effects set up inside the component's `adoptElement`
 * callback must target the adopted nodes, so mutating a signal after
 * hydration changes the live DOM (not an orphan).
 */

function mountSsr(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

describe('Button hydrates without rebuilding its tree', () => {
  it('adopts the server root button plus its four slot spans', async () => {
    const { Button } = await import('../src/components/Button');
    const build = () =>
      Button({ children: 'go', variant: 'filled', size: 'md', color: 'primary' });

    const { html } = await renderToString(build);
    // Sanity: structural shape the hydrate step will walk against.
    expect(html).toContain('<button');
    expect(html).toContain('class="mkt-button"');
    // Four slot spans: leftIcon, label, rightIcon, loader.
    expect((html.match(/<span /g) ?? []).length).toBe(4);

    const container = mountSsr(html);
    try {
      const serverBtn = container.firstChild as HTMLButtonElement;
      const serverSpans = Array.from(serverBtn.children);
      expect(serverSpans.length).toBe(4);

      const dispose = hydrate(build, container);
      try {
        // Same button, same four spans, in the same order.
        expect(container.firstChild).toBe(serverBtn);
        const liveSpans = Array.from(serverBtn.children);
        expect(liveSpans.length).toBe(4);
        for (let i = 0; i < 4; i++) {
          expect(liveSpans[i]).toBe(serverSpans[i]);
        }
        // Dataset / label content survived adoption.
        expect(serverBtn.dataset.variant).toBe('filled');
        expect(serverBtn.dataset.size).toBe('md');
        expect(serverBtn.dataset.color).toBe('primary');
        expect(serverBtn.textContent).toContain('go');
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('propagates prop changes through reactive effects after hydration', async () => {
    const { Button } = await import('../src/components/Button');
    const [variant, setVariant] = signal<'filled' | 'outline'>('filled');
    const build = () =>
      Button({
        children: 'go',
        // A getter prop so reads stay reactive inside Button's setup.
        get variant() {
          return variant();
        },
      });

    const { html } = await renderToString(build);
    expect(html).toContain('data-variant="filled"');

    const container = mountSsr(html);
    try {
      const serverBtn = container.firstChild as HTMLButtonElement;

      const dispose = hydrate(build, container);
      try {
        setVariant('outline');
        flushSync();
        // The dataset write happened against the adopted server button,
        // not a detached clone.
        expect(serverBtn.dataset.variant).toBe('outline');
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('fires click handlers wired during hydration against the adopted button', async () => {
    const { Button } = await import('../src/components/Button');
    let clicks = 0;
    const onClick = () => {
      clicks++;
    };
    const build = () => Button({ children: 'go', onClick });

    const { html } = await renderToString(build);

    const container = mountSsr(html);
    try {
      const serverBtn = container.firstChild as HTMLButtonElement;

      const dispose = hydrate(build, container);
      try {
        // Click the LIVE node in the document. If Button had attached
        // its handler to an orphan, the click here wouldn't fire it.
        serverBtn.click();
        expect(clicks).toBe(1);
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('Checkbox adopts its label, input, icon, and text column', async () => {
    const { Checkbox } = await import('../src/components/Checkbox');
    const build = () => Checkbox({ label: 'Agree', defaultChecked: true });

    const { html } = await renderToString(build);
    expect(html).toContain('<label');
    expect(html).toContain('<input');
    expect(html).toContain('mkt-checkbox__icon');
    expect(html).toContain('Agree');

    const container = mountSsr(html);
    try {
      const serverLabel = container.firstChild as HTMLLabelElement;
      const serverInput = serverLabel.querySelector('input') as HTMLInputElement;
      const serverIcon = serverLabel.querySelector('.mkt-checkbox__icon');
      const serverLabelSpan = serverLabel.querySelector('.mkt-checkbox__label');
      const serverSvg = serverIcon?.querySelector('svg');

      const dispose = hydrate(build, container);
      try {
        expect(container.firstChild).toBe(serverLabel);
        expect(serverLabel.querySelector('input')).toBe(serverInput);
        expect(serverLabel.querySelector('.mkt-checkbox__icon')).toBe(serverIcon);
        expect(serverLabel.querySelector('.mkt-checkbox__label')).toBe(serverLabelSpan);
        // The SVG inside the icon should NOT have been duplicated on
        // hydration — adoptElement sees it present and skips the
        // one-shot appendChild.
        expect(serverIcon?.querySelectorAll('svg').length).toBe(1);
        expect(serverIcon?.firstChild).toBe(serverSvg);
        // State still intact.
        expect(serverInput.checked).toBe(true);
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('Checkbox reacts to `checked` prop changes after hydration', async () => {
    const { Checkbox } = await import('../src/components/Checkbox');
    const [checked, setChecked] = signal(false);
    const build = () =>
      Checkbox({
        label: 'Agree',
        get checked() {
          return checked();
        },
      });

    const { html } = await renderToString(build);
    const container = mountSsr(html);
    try {
      const serverInput = container.querySelector('input') as HTMLInputElement;
      expect(serverInput.checked).toBe(false);

      const dispose = hydrate(build, container);
      try {
        setChecked(true);
        flushSync();
        expect(serverInput.checked).toBe(true);
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('Switch adopts label, input, track+thumb, and text column', async () => {
    const { Switch } = await import('../src/components/Switch');
    const build = () => Switch({ label: 'Enable', defaultChecked: true });

    const { html } = await renderToString(build);
    expect(html).toContain('role="switch"');
    expect(html).toContain('mkt-switch__track');
    expect(html).toContain('mkt-switch__thumb');

    const container = mountSsr(html);
    try {
      const root = container.firstChild as HTMLLabelElement;
      const input = root.querySelector('input') as HTMLInputElement;
      const track = root.querySelector('.mkt-switch__track') as HTMLElement;
      const thumb = root.querySelector('.mkt-switch__thumb') as HTMLElement;
      const labelSpan = root.querySelector('.mkt-switch__label') as HTMLElement;

      const dispose = hydrate(build, container);
      try {
        expect(container.firstChild).toBe(root);
        expect(root.querySelector('input')).toBe(input);
        expect(root.querySelector('.mkt-switch__track')).toBe(track);
        expect(root.querySelector('.mkt-switch__thumb')).toBe(thumb);
        expect(root.querySelector('.mkt-switch__label')).toBe(labelSpan);
        expect(input.checked).toBe(true);
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('Select adopts the wrapper + <select> + options without duplicating', async () => {
    const { Select } = await import('../src/components/Select');
    const build = () =>
      Select({
        label: 'Fruit',
        data: [
          { value: 'apple', label: 'Apple' },
          { value: 'pear', label: 'Pear' },
        ],
        defaultValue: 'apple',
      });

    const { html } = await renderToString(build);
    expect(html).toContain('<select');
    expect(html).toContain('<option value="apple"');
    expect(html).toContain('<option value="pear"');

    const container = mountSsr(html);
    try {
      const serverSelect = container.querySelector('select') as HTMLSelectElement;
      const serverOptions = Array.from(serverSelect.querySelectorAll('option'));
      expect(serverOptions.length).toBe(2);

      const dispose = hydrate(build, container);
      try {
        // Same node, options not duplicated.
        expect(container.querySelector('select')).toBe(serverSelect);
        const liveOptions = Array.from(serverSelect.querySelectorAll('option'));
        expect(liveOptions.length).toBe(2);
        for (let i = 0; i < 2; i++) {
          expect(liveOptions[i]).toBe(serverOptions[i]);
        }
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('TextInput adopts wrapper, input, and applies value + placeholder', async () => {
    const { TextInput } = await import('../src/components/TextInput');
    const build = () =>
      TextInput({
        label: 'Name',
        defaultValue: 'Ada',
        placeholder: 'Your name',
      });

    const { html } = await renderToString(build);
    expect(html).toContain('<input');
    expect(html).toContain('Your name');

    const container = mountSsr(html);
    try {
      const serverInput = container.querySelector('input') as HTMLInputElement;
      expect(serverInput.value).toBe('Ada');

      const dispose = hydrate(build, container);
      try {
        expect(container.querySelector('input')).toBe(serverInput);
        expect(serverInput.value).toBe('Ada');
        expect(serverInput.placeholder).toBe('Your name');
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('NumberInput adopts input + up/down buttons, preserving click handlers', async () => {
    const { NumberInput } = await import('../src/components/NumberInput');
    const events: number[] = [];
    const build = () =>
      NumberInput({
        label: 'Count',
        defaultValue: 5,
        step: 1,
        onValueChange: (v) => events.push(v),
      });

    const { html } = await renderToString(build);
    expect(html).toContain('type="number"');
    // Two arrow buttons.
    expect((html.match(/<button /g) ?? []).length).toBe(2);

    const container = mountSsr(html);
    try {
      const serverInput = container.querySelector('input') as HTMLInputElement;
      const [serverUp, serverDown] = Array.from(
        container.querySelectorAll('button'),
      );

      const dispose = hydrate(build, container);
      try {
        expect(container.querySelector('input')).toBe(serverInput);
        expect(serverInput.value).toBe('5');

        serverUp.click();
        flushSync();
        expect(events).toEqual([6]);
        expect(serverInput.value).toBe('6');

        serverDown.click();
        flushSync();
        expect(events).toEqual([6, 5]);
        expect(serverInput.value).toBe('5');
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('Loader adopts its span + sr-only child without rebuilding', async () => {
    const { Loader } = await import('../src/components/Loader');
    const build = () => Loader({ size: 'md' });

    const { html } = await renderToString(build);
    expect(html).toContain('mkt-loader');
    expect(html).toContain('mkt-loader__sr-only');
    expect(html).toContain('role="status"');

    const container = mountSsr(html);
    try {
      const serverEl = container.firstChild as HTMLElement;
      const serverSr = serverEl.firstChild as HTMLElement;

      const dispose = hydrate(build, container);
      try {
        expect(container.firstChild).toBe(serverEl);
        expect(serverEl.firstChild).toBe(serverSr);
        expect(serverSr.textContent).toBe('Loading...');
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });

  it('swaps label children when the signal fires without detaching siblings', async () => {
    const { Button } = await import('../src/components/Button');
    const [label, setLabel] = signal('one');
    const build = () =>
      Button({
        get children() {
          return label();
        },
      });

    const { html } = await renderToString(build);
    expect(html).toContain('one');

    const container = mountSsr(html);
    try {
      const serverBtn = container.firstChild as HTMLButtonElement;
      const allSpans = Array.from(serverBtn.children);
      expect(allSpans.length).toBe(4);

      const dispose = hydrate(build, container);
      try {
        setLabel('two');
        flushSync();
        expect(serverBtn.textContent).toContain('two');
        // Still four siblings - the reactive swap only touched label
        // contents, not its parent's children list.
        expect(serverBtn.children.length).toBe(4);
        for (let i = 0; i < 4; i++) {
          expect(serverBtn.children[i]).toBe(allSpans[i]);
        }
      } finally {
        dispose();
      }
    } finally {
      container.remove();
    }
  });
});
