/**
 * Scroll position save/restore.
 *
 * Tracks scroll positions for window + registered CSS selectors
 * (nested scrollable containers), keyed by route path.
 */

import type { ScrollBehaviorOption } from './types';

interface ScrollPositions {
  x: number;
  y: number;
  containers: Map<string, { x: number; y: number }>;
}

export interface ScrollManager {
  save(key: string): void;
  restore(key: string): void;
  scrollToTop(): void;
  dispose(): void;
}

export function createScrollManager(
  behavior: ScrollBehaviorOption | undefined
): ScrollManager {
  const positions = new Map<string, ScrollPositions>();
  const selectors: string[] = [];
  let scrollBehavior: ScrollBehavior = 'auto';

  if (typeof behavior === 'string') {
    scrollBehavior = behavior;
  } else if (typeof behavior === 'object') {
    scrollBehavior = behavior.behavior ?? 'auto';
    if (behavior.selectors) {
      selectors.push(...behavior.selectors);
    }
  }

  return {
    save(key: string) {
      const containers = new Map<string, { x: number; y: number }>();

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          containers.set(selector, {
            x: el.scrollLeft,
            y: el.scrollTop,
          });
        }
      }

      positions.set(key, {
        x: window.scrollX,
        y: window.scrollY,
        containers,
      });
    },

    restore(key: string) {
      const saved = positions.get(key);
      if (!saved) return;

      window.scrollTo({
        left: saved.x,
        top: saved.y,
        behavior: scrollBehavior,
      });

      for (const [selector, pos] of saved.containers) {
        const el = document.querySelector(selector);
        if (el) {
          el.scrollTo({
            left: pos.x,
            top: pos.y,
            behavior: scrollBehavior,
          });
        }
      }
    },

    scrollToTop() {
      window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior });
    },

    dispose() {
      positions.clear();
    },
  };
}
