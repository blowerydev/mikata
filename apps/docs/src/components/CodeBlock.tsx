import { codeToHtml } from 'shiki';

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
 */
export function CodeBlock(props: CodeBlockProps) {
  return <div class="codeblock" innerHTML={props.html} />;
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
