/**
 * Link component - declarative navigation with active state.
 */

import { computed, renderEffect, suppressLeakTracking } from '@mikata/reactivity';
import { adoptElement, inject, _insert } from '@mikata/runtime';
import { RouterContext } from './outlet';
import type { NavigateTarget } from './types';

declare const __DEV__: boolean;

// Schemes we consider safe on <a href>. Anything else (javascript:, data:,
// vbscript:, file:, etc.) is flagged in dev.
const SAFE_SCHEME = /^(https?:|mailto:|tel:|ftp:|sms:|#|\/|\?|[^:]*$)/i;

export interface LinkProps {
  to: string | NavigateTarget;
  replace?: boolean;
  class?: string;
  activeClass?: string;
  exactActiveClass?: string;
  preload?: boolean | 'hover' | 'visible';
  /** Standard HTML attributes to forward to the <a> element. */
  [key: string]: unknown;
}

/**
 * Navigation link component.
 * Renders an <a> element with click interception, active class,
 * and optional preloading.
 *
 * Usage:
 *   Link({ to: '/about', class: 'nav-link', activeClass: 'active' })
 */
export function Link(props: LinkProps): Node {
  const { router, base } = inject(RouterContext);
  const {
    to,
    replace = false,
    class: className,
    activeClass = 'active',
    exactActiveClass,
    preload,
    children,
    ...rest
  } = props;

  return adoptElement<HTMLAnchorElement>('a', (el) => {
    // Resolve href. `base` is prefixed so the rendered `<a href>` lands on
    // the correct URL when the app is hosted under a sub-path — the
    // browser handles right-click-open-in-new-tab, middle-click, and
    // no-JS navigation entirely via the href attribute, so a bare
    // route path would 404 on GitHub Pages' `/mikata/` mount.
    const href = computed(() => {
      let path: string;
      if (typeof to === 'string') {
        path = to;
      } else {
        path = to.path;
        if (to.params) {
          for (const [key, value] of Object.entries(to.params)) {
            path = path.replace(`:${key}`, encodeURIComponent(String(value)));
          }
        }
        if (to.search) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(to.search)) {
            if (value != null) params.set(key, String(value));
          }
          const str = params.toString();
          if (str) path += '?' + str;
        }
        if (to.hash) {
          path += to.hash.startsWith('#') ? to.hash : '#' + to.hash;
        }
      }
      return applyBase(base, path);
    });

    // Keep href in sync
    renderEffect(() => {
      const value = href();
      if (__DEV__ && !SAFE_SCHEME.test(value)) {
        console.warn(
          `[mikata/router] <Link to="${value}"> uses an unsafe URL scheme. ` +
          'javascript:, data:, and similar schemes can execute arbitrary code when clicked.',
        );
      }
      el.setAttribute('href', value);
    });

    // Active state. `router.path()` is base-stripped (the history adapter
    // removes the prefix before handing paths to the router), so we
    // compare against the logical, un-prefixed target rather than `href()`
    // which carries the base for display purposes.
    const logicalTarget = computed(() => {
      const raw = typeof to === 'string' ? to : to.path;
      return raw.split('?')[0].split('#')[0];
    });
    const isActive = computed(() => {
      const current = router.path();
      const target = logicalTarget();
      return current === target || current.startsWith(target + '/');
    });

    const isExactActive = computed(() => {
      const current = router.path();
      return current === logicalTarget();
    });

    // Apply classes
    renderEffect(() => {
      const classes: string[] = [];
      if (className) classes.push(className);
      if (isActive() && activeClass) classes.push(activeClass);
      if (isExactActive() && exactActiveClass) classes.push(exactActiveClass);
      el.className = classes.join(' ');
    });

    // `aria-current="page"` on the exact-match anchor. Screen readers
    // announce it and CSS can target `a[aria-current='page']` without a
    // per-app active-class convention. Removed (not set to `false`) when
    // inactive — the attribute's absence is the "not current" state.
    renderEffect(() => {
      if (isExactActive()) {
        el.setAttribute('aria-current', 'page');
      } else {
        el.removeAttribute('aria-current');
      }
    });

    // Click handler - intercept navigation. Listener is bound to the
    // `<a>` we're about to return, so it GCs with the element when the
    // link is removed from the DOM. `suppressLeakTracking` keeps the
    // dev-mode detector from blaming this on a containing renderEffect
    // (a parent `_insert` accessor frame, for instance).
    suppressLeakTracking(() => {
      // Forward additional attributes/events before the router's own click
      // handler, so user handlers can call preventDefault() to opt out.
      for (const [key, value] of Object.entries(rest)) {
        if (isEventProp(key)) {
          if (typeof value === 'function') {
            el.addEventListener(eventNameForProp(key), value as EventListener);
          }
        } else if (typeof value === 'string') {
          el.setAttribute(key, value);
        }
      }

      el.addEventListener('click', (e: MouseEvent) => {
        // Allow normal behavior for modified clicks
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (e.defaultPrevented) return;
        e.preventDefault();
        router.navigate(to, { replace });
      });

      if (preload === true || preload === 'hover') {
        el.addEventListener('mouseenter', () => {
          // If the target route is lazy, trigger preload
          const target = href().split('?')[0].split('#')[0];
          // The lazy component's preload is handled by the lazy() wrapper
          // We could prefetch here in the future
        }, { once: true });
      }
    });

    if (children !== undefined) {
      _insert(el as HTMLElement, children as never);
    }
  });
}

/**
 * Prepend the router base to a logical path. Leaves absolute URLs,
 * anchors (`#frag`), query strings (`?x=1`), and already-prefixed
 * paths alone - users explicitly writing `/mikata/foo` in `to` don't
 * want the base added a second time.
 */
function applyBase(base: string, path: string): string {
  if (!base) return path;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path; // absolute scheme
  if (path.startsWith('//')) return path;              // protocol-relative
  if (path.startsWith('#') || path.startsWith('?')) return path;
  if (path === base || path.startsWith(base + '/')) return path;
  const segment = path.startsWith('/') ? path : '/' + path;
  return base + segment;
}

function isEventProp(key: string): boolean {
  return /^on[A-Z]/.test(key);
}

function eventNameForProp(key: string): string {
  return key.slice(2).toLowerCase();
}
