/**
 * ErrorBoundary - catches errors thrown during component rendering
 * and displays a fallback UI.
 */

import { createScope, type Scope } from '@mikata/reactivity';

interface ErrorBoundaryProps {
  fallback: (error: Error, reset: () => void) => Node;
  children: Node | Node[];
}

/**
 * Wrap children in an error boundary. If any child throws during
 * rendering, the fallback is shown instead.
 *
 * Usage:
 *   _createComponent(ErrorBoundary, {
 *     fallback: (err, reset) => <div>Error: {err.message} <button onClick={reset}>Retry</button></div>,
 *     children: <RiskyComponent />
 *   })
 */
export function ErrorBoundary(props: ErrorBoundaryProps): Node {
  const container = document.createElement('div');
  container.style.display = 'contents';
  let childScope: Scope | null = null;

  function renderChildren(): { node: Node; error?: Error } {
    if (childScope) {
      childScope.dispose();
      childScope = null;
    }

    try {
      const frag = document.createDocumentFragment();
      childScope = createScope(() => {
        const children = Array.isArray(props.children)
          ? props.children
          : [props.children];
        for (const child of children) {
          if (child instanceof Node) {
            frag.appendChild(child);
          } else if (child != null) {
            frag.appendChild(document.createTextNode(String(child)));
          }
        }
      });
      return { node: frag };
    } catch (err) {
      return {
        node: document.createComment('error-boundary:error'),
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  function mount() {
    container.textContent = '';
    const result = renderChildren();
    if (result.error) {
      // Render fallback synchronously - no signal/effect needed
      const fallbackNode = props.fallback(result.error, reset);
      container.appendChild(fallbackNode);
    } else {
      container.appendChild(result.node);
    }
  }

  function reset() {
    mount();
  }

  mount();
  return container;
}
