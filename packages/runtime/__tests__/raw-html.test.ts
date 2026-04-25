import { describe, it, expect, vi } from 'vitest';
import { signal, flushSync } from '@mikata/reactivity';
import { render } from '../src/render';
import { _createComponent } from '../src/component';
import { RawHTML } from '../src/raw-html';

function mount(build: () => Node) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const dispose = render(build, container);
  return {
    container,
    dispose: () => {
      dispose();
      container.remove();
    },
  };
}

describe('RawHTML', () => {
  it('inserts pre-built HTML as the wrapping div\'s contents', () => {
    const { container, dispose } = mount(() =>
      _createComponent(RawHTML, { html: '<p>hi</p>' }),
    );
    try {
      const div = container.firstChild as HTMLDivElement;
      expect(div.tagName).toBe('DIV');
      expect(div.innerHTML).toBe('<p>hi</p>');
    } finally {
      dispose();
    }
  });

  it('updates in place when the html prop changes reactively', () => {
    const [html, setHtml] = signal('<p>one</p>');
    const { container, dispose } = mount(() =>
      _createComponent(RawHTML, {
        get html() {
          return html();
        },
      }),
    );
    try {
      const div = container.firstChild as HTMLDivElement;
      expect(div.innerHTML).toBe('<p>one</p>');
      setHtml('<p>two</p>');
      flushSync();
      // Same wrapping div - reactive innerHTML write, not a re-render.
      expect(container.firstChild).toBe(div);
      expect(div.innerHTML).toBe('<p>two</p>');
    } finally {
      dispose();
    }
  });

  it('applies the optional class prop', () => {
    const { container, dispose } = mount(() =>
      _createComponent(RawHTML, { html: '<span/>', class: 'codeblock' }),
    );
    try {
      const div = container.firstChild as HTMLDivElement;
      expect(div.className).toBe('codeblock');
    } finally {
      dispose();
    }
  });

  it('inherits the dev-mode XSS warning from _setProp', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { dispose } = mount(() =>
        _createComponent(RawHTML, {
          html: '<img src=x onerror=alert(1)>',
        }),
      );
      expect(warn).toHaveBeenCalled();
      const msg = warn.mock.calls[0]?.[0] as string;
      expect(msg).toContain('innerHTML');
      dispose();
    } finally {
      warn.mockRestore();
    }
  });
});
