import { codeToHtml } from 'shiki';
import { signal } from '@mikata/reactivity';
import { RawHTML } from '@mikata/runtime';

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
        {() => (copied() ? <CheckIcon /> : <CopyIcon />)}
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

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
