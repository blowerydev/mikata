/**
 * Link component - declarative navigation with active state.
 */

import { computed, renderEffect } from '@mikata/reactivity';
import { inject } from '@mikata/runtime';
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
  const { router } = inject(RouterContext);
  const {
    to,
    replace = false,
    class: className,
    activeClass = 'active',
    exactActiveClass,
    preload,
    ...rest
  } = props;

  const el = document.createElement('a');

  // Resolve href
  const href = computed(() => {
    if (typeof to === 'string') return to;
    let path = to.path;
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
    return path;
  });

  // Keep href in sync
  renderEffect(() => {
    const value = href();
    if (__DEV__ && !SAFE_SCHEME.test(value)) {
      console.warn(
        `[mikata/router] <Link to="${value}"> uses an unsafe URL scheme. ` +
        'javascript:, data:, and similar schemes can execute arbitrary code when clicked.'
      );
    }
    el.setAttribute('href', value);
  });

  // Active state
  const isActive = computed(() => {
    const current = router.path();
    const target = href().split('?')[0].split('#')[0];
    return current === target || current.startsWith(target + '/');
  });

  const isExactActive = computed(() => {
    const current = router.path();
    const target = href().split('?')[0].split('#')[0];
    return current === target;
  });

  // Apply classes
  renderEffect(() => {
    const classes: string[] = [];
    if (className) classes.push(className);
    if (isActive() && activeClass) classes.push(activeClass);
    if (isExactActive() && exactActiveClass) classes.push(exactActiveClass);
    el.className = classes.join(' ');
  });

  // Click handler - intercept navigation
  el.addEventListener('click', (e: MouseEvent) => {
    // Allow normal behavior for modified clicks
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.navigate(to, { replace });
  });

  // Preloading
  if (preload === true || preload === 'hover') {
    el.addEventListener('mouseenter', () => {
      // If the target route is lazy, trigger preload
      const target = href().split('?')[0].split('#')[0];
      // The lazy component's preload is handled by the lazy() wrapper
      // We could prefetch here in the future
    }, { once: true });
  }

  // Forward additional attributes
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'string') {
      el.setAttribute(key, value);
    }
  }

  return el;
}
