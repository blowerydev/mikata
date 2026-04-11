/**
 * Guard evaluation pipeline.
 *
 * Guards are run sequentially (global → route-level → component-level).
 * Return void/true to allow, false to block, string/NavigateTarget to redirect.
 */

import type { RouteGuard, GuardResult, MatchedRoute, NavigateTarget } from './types';

/**
 * Run an array of guards sequentially.
 * Returns:
 *   - true if all guards allow
 *   - false if any guard blocks
 *   - NavigateTarget/string if a guard redirects
 */
export async function runGuards(
  guards: RouteGuard[],
  to: MatchedRoute,
  from: MatchedRoute | null
): Promise<true | false | string | NavigateTarget> {
  for (const guard of guards) {
    const result = await guard(to, from);
    const normalized = normalizeResult(result);

    if (normalized === false) return false;
    if (normalized !== true) return normalized;
  }

  return true;
}

function normalizeResult(
  result: GuardResult
): true | false | string | NavigateTarget {
  if (result === undefined || result === null || result === true) return true;
  if (result === false) return false;
  // string or NavigateTarget
  return result;
}
