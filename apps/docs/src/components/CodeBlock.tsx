import { codeToHtml } from 'shiki';
import { signal } from '@mikata/reactivity';
import { RawHTML } from '@mikata/runtime';
import { createIcon, Copy, Check } from '@mikata/icons';

export interface CodeBlockProps {
  /** Pre-highlighted HTML produced by `highlight(...)`. */
  html: string;
}

/**
 * Render a pre-highlighted code block. Callers run `highlight(...)` at
 * module top-level (top-level await works in route modules because kit
 * loads them via dynamic `import()`) and pass the resulting HTML here.
 * On hydration the already-highlighted markup is adopted - no Shiki
 * runtime shipped to the browser.
 *
 * The copy button reads `textContent` off the rendered code on click,
 * so the original source text isn't threaded through every call site.
 * `textContent` strips Shiki's wrapping spans and returns the literal
 * code the user typed into `highlight(...)`.
 */
export function CodeBlock(props: CodeBlockProps) {
  const [copied, setCopied] = signal(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const onCopy = async (event: MouseEvent) => {
    const wrapper = (event.currentTarget as HTMLElement).parentElement;
    const inner = wrapper?.querySelector('.codeblock');
    const text = (inner as HTMLElement | null)?.textContent ?? '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Browsers without clipboard access (older, or insecure context)
      // - silently no-op so a stale tooltip isn't worse than nothing.
    }
  };

  return (
    <div class="codeblock-wrapper">
      <button
        type="button"
        class="codeblock-copy"
        aria-label={copied() ? 'Code copied' : 'Copy code'}
        data-copied={copied() ? 'true' : 'false'}
        onClick={onCopy}
      >
        {createIcon(Copy, { size: 14, class: 'codeblock-copy-icon codeblock-copy-icon-copy' })}
        {createIcon(Check, { size: 14, class: 'codeblock-copy-icon codeblock-copy-icon-check' })}
      </button>
      <RawHTML class="codeblock" html={props.html} />
    </div>
  );
}

/**
 * Pre-highlight code to HTML with Shiki's dual-theme mode. The output
 * embeds both light and dark colors as CSS variables; styles.css swaps
 * them based on `data-theme`. Call at module top-level of a route.
 */
export async function highlight(code: string, lang: string = 'tsx'): Promise<string> {
  return codeToHtml(code.trim(), {
    lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    defaultColor: false,
  });
}
