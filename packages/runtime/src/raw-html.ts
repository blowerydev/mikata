/**
 * `<RawHTML>` - sanctioned wrapper for the `innerHTML` JSX prop.
 *
 * The runtime's `_setProp` recognises `innerHTML` as a property sink and
 * pipes it through a dev-mode XSS heuristic (script-like content,
 * inline event handlers, `javascript:` URLs - see `dom.ts`). That makes
 * `<div innerHTML={x} />` a load-bearing pattern, not a leak from the
 * generic property-set path. `RawHTML` packages it as a named
 * primitive so call sites are easy to grep, the security review burden
 * is concentrated, and the documented entry point matches what people
 * find in editor autocomplete.
 *
 * Use for pre-built / pre-sanitised HTML that the server already
 * produced - syntax-highlighted code, MDX render output, sanitised
 * CMS payloads. Don't use for user input. The same XSS warning the
 * raw `innerHTML` prop fires applies here.
 *
 * Hydration-aware: built on `adoptElement`, so a server-rendered
 * `<RawHTML>` adopts its existing div in place. The renderEffect on
 * `props.html` re-runs only when the input changes - on the
 * adopt path the first run writes the same string the server emitted,
 * which is wasted but correct (node identity for descendants is
 * already moot inside an opaque HTML payload).
 */

import { renderEffect } from '@mikata/reactivity';
import { adoptElement, _setProp } from './dom';

export interface RawHTMLProps {
  /** HTML string to insert as the container's contents. */
  html: string;
  /**
   * Optional CSS class on the wrapping `<div>`. Reactive: a signal-backed
   * value updates the class without re-creating the element.
   */
  class?: string;
}

export function RawHTML(props: RawHTMLProps): HTMLDivElement {
  return adoptElement<HTMLDivElement>('div', (el) => {
    // Route through `_setProp` so RawHTML inherits the same dev-mode
    // XSS heuristic the raw `innerHTML` JSX prop fires on.
    renderEffect(() => {
      _setProp(el, 'innerHTML', props.html);
    });
    if (props.class !== undefined) {
      renderEffect(() => {
        el.className = props.class ?? '';
      });
    }
  });
}
