/**
 * Client-side render + reactivity tests for the docs Playground.
 *
 * Scope: Playground is the one docs-only component whose bugs don't
 * show up in package-level tests - a runtime change that breaks the
 * "render callback runs once, signals drive updates in place" contract
 * only surfaces when someone loads a demo page in a browser. These
 * tests pin that contract.
 *
 * Why client-side only: Playground is a `.tsx` module, so the compiler
 * emits `_template(...)` calls at module load. Under jsdom those
 * capture the jsdom document; `renderToString` can't retroactively swap
 * them for shim nodes, so SSR tests would fail for reasons unrelated to
 * any runtime regression. Hydration-specific coverage for docs pages
 * lives in `packages/server/__tests__/hydrate.test.ts` against raw
 * runtime primitives; this file focuses on the reactive-props
 * interaction that's unique to Playground.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@mikata/runtime';
import { flushSync } from '@mikata/reactivity';
import { fireEvent } from '@mikata/testing';
import { Button } from '@mikata/ui';
import { Playground, type PlaygroundControl } from './Playground';

const controls = [
  { name: 'label', type: 'text', default: 'Click me' },
  { name: 'disabled', type: 'boolean', default: false },
  {
    name: 'variant',
    type: 'select',
    options: ['filled', 'outline'],
    default: 'filled',
  },
] as const satisfies readonly PlaygroundControl[];

function App() {
  return (
    <Playground
      controls={controls}
      render={(props) => (
        <Button variant={props.variant} disabled={props.disabled}>
          {props.label}
        </Button>
      )}
    />
  );
}

function mount(): { container: HTMLElement; dispose: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const disposeRender = render(App, container);
  return {
    container,
    dispose: () => {
      disposeRender();
      container.remove();
    },
  };
}

function watchLeakWarnings(): { assertClean: () => void; restore: () => void } {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  return {
    assertClean: () => {
      expect(
        warn.mock.calls.filter(([message]) =>
          String(message).includes('Possible subscription leak'),
        ),
      ).toEqual([]);
    },
    restore: () => warn.mockRestore(),
  };
}

describe('Playground', () => {
  it('renders the preview subtree from the render callback with defaults applied', () => {
    const leaks = watchLeakWarnings();
    const { container, dispose } = mount();
    try {
      const button = container.querySelector(
        '.playground-preview button',
      ) as HTMLButtonElement | null;
      expect(button).toBeTruthy();
      expect(button!.textContent).toContain('Click me');
      expect(button!.disabled).toBe(false);
      leaks.assertClean();
    } finally {
      dispose();
      leaks.restore();
    }
  });

  it('updates the preview in place when a boolean control toggles', () => {
    const leaks = watchLeakWarnings();
    const { container, dispose } = mount();
    try {
      const previewButton = container.querySelector(
        '.playground-preview button',
      ) as HTMLButtonElement;
      expect(previewButton.disabled).toBe(false);

      const checkbox = container.querySelector(
        '.playground-controls input[type="checkbox"]',
      ) as HTMLInputElement | null;
      expect(checkbox).toBeTruthy();
      checkbox!.checked = true;
      fireEvent.change(checkbox!, { target: { checked: true } });
      flushSync();

      expect(previewButton.disabled).toBe(true);
      // Same node - reactive attribute write, not a re-render. If the
      // slot accessor rebuilt its subtree, this identity check fails.
      expect(
        container.querySelector('.playground-preview button'),
      ).toBe(previewButton);
      leaks.assertClean();
    } finally {
      dispose();
      leaks.restore();
    }
  });

  it('updates the preview in place when a text control changes', () => {
    const leaks = watchLeakWarnings();
    const { container, dispose } = mount();
    try {
      const previewButton = container.querySelector(
        '.playground-preview button',
      ) as HTMLButtonElement;
      expect(previewButton.textContent).toContain('Click me');

      const textInput = container.querySelector(
        '.playground-controls input[type="text"]',
      ) as HTMLInputElement | null;
      expect(textInput).toBeTruthy();
      textInput!.value = 'Submit';
      fireEvent.input(textInput!, { target: { value: 'Submit' } });
      flushSync();

      expect(previewButton.textContent).toContain('Submit');
      expect(
        container.querySelector('.playground-preview button'),
      ).toBe(previewButton);
      leaks.assertClean();
    } finally {
      dispose();
      leaks.restore();
    }
  });

  it('updates the preview in place when a select control changes', () => {
    const leaks = watchLeakWarnings();
    const { container, dispose } = mount();
    try {
      const previewButton = container.querySelector(
        '.playground-preview button',
      ) as HTMLButtonElement;
      expect(previewButton.getAttribute('data-variant')).toBe('filled');

      // @mikata/ui Select renders a native <select>. Grab the first one
      // inside controls (variant is the only select in this fixture).
      const select = container.querySelector(
        '.playground-controls select',
      ) as HTMLSelectElement | null;
      expect(select).toBeTruthy();
      select!.value = 'outline';
      fireEvent.change(select!, { target: { value: 'outline' } });
      flushSync();

      expect(previewButton.getAttribute('data-variant')).toBe('outline');
      expect(
        container.querySelector('.playground-preview button'),
      ).toBe(previewButton);
      leaks.assertClean();
    } finally {
      dispose();
      leaks.restore();
    }
  });
});
