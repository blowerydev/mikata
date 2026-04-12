import type { ReadSignal } from '@mikata/reactivity';
import { createMediaQuery } from './create-media-query';

/**
 * Track whether the user has requested reduced motion.
 *
 * Usage:
 *   const reduceMotion = createReducedMotion();
 *   const duration = reduceMotion() ? 0 : 300;
 */
export function createReducedMotion(): ReadSignal<boolean> {
  return createMediaQuery('(prefers-reduced-motion: reduce)');
}
