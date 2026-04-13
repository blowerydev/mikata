/**
 * portal() - render children into a different DOM subtree.
 *
 * Consistent with show()/each()/switchMatch() - functions not components.
 * Manages its own scope for cleanup when the parent is disposed.
 *
 * Usage:
 *   portal(
 *     () => <Modal title="Hello">Content</Modal>,
 *     document.body
 *   )
 *
 *   portal(
 *     () => <Tooltip>Help text</Tooltip>,
 *     '#tooltip-root'
 *   )
 */

import { createScope, onCleanup, type Scope } from '@mikata/reactivity';

declare const __DEV__: boolean;

/**
 * Render content into a target DOM node outside the component tree.
 *
 * @param render Function returning the content to render
 * @param target DOM element or CSS selector string
 * @returns A comment node placeholder in the original position
 */
export function portal(
  render: () => Node,
  target: HTMLElement | string
): Node {
  const placeholder = document.createComment('portal');

  const container = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!container) {
    if (__DEV__) {
      console.warn(
        `[mikata] portal() target not found: ${target}. Content will not be rendered.`
      );
    }
    return placeholder;
  }

  let portalNode: Node | null = null;
  const scope = createScope(() => {
    portalNode = render();
    container.appendChild(portalNode);

    onCleanup(() => {
      if (portalNode && portalNode.parentNode) {
        portalNode.parentNode.removeChild(portalNode);
      }
    });
  });

  return placeholder;
}
