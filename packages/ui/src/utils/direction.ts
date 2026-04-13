import type { Direction } from '../theme/types';

/**
 * Arrow-key pairs for directional keyboard nav.
 *
 * On a horizontal axis, "previous" is ArrowLeft in LTR and ArrowRight in RTL.
 * On a vertical axis, direction is irrelevant - returns ArrowUp/ArrowDown.
 */
export function directionalArrowKeys(
  isHorizontal: boolean,
  direction: Direction,
): { prevKey: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp'; nextKey: 'ArrowLeft' | 'ArrowRight' | 'ArrowDown' } {
  if (!isHorizontal) return { prevKey: 'ArrowUp', nextKey: 'ArrowDown' };
  const isRtl = direction === 'rtl';
  return {
    prevKey: isRtl ? 'ArrowRight' : 'ArrowLeft',
    nextKey: isRtl ? 'ArrowLeft' : 'ArrowRight',
  };
}
