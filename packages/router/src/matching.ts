/**
 * URL pattern matching - matches a pathname against a route tree
 * and extracts path parameters.
 */

import type {
  NormalizedRoute,
  RouteMatch,
  RouteSegment,
} from './types';

// ---------------------------------------------------------------------------
// Parse path into segments
// ---------------------------------------------------------------------------

export function parseSegments(path: string): RouteSegment[] {
  const parts = path.split('/').filter(Boolean);
  return parts.map((part) => {
    if (part === '*' || part === '**') {
      return { type: 'wildcard', value: 'wild' };
    }
    if (part.startsWith(':')) {
      return { type: 'param', value: part.slice(1) };
    }
    return { type: 'static', value: part };
  });
}

// ---------------------------------------------------------------------------
// Compile a path pattern into a RegExp + param names
// ---------------------------------------------------------------------------

export function compilePath(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const parts = path.split('/').filter(Boolean);

  let pattern = '^';
  for (const part of parts) {
    if (part === '*' || part === '**') {
      paramNames.push('*');
      pattern += '/(.+)';
    } else if (part.startsWith(':')) {
      paramNames.push(part.slice(1));
      pattern += '/([^/]+)';
    } else {
      pattern += '/' + escapeRegex(part);
    }
  }

  // Match exact path or with trailing slash
  if (pattern === '^') pattern = '^/';
  pattern += '/?$';

  return { regex: new RegExp(pattern), paramNames };
}

/**
 * Compile a path as a prefix (no end anchor) for parent route matching.
 */
function compilePrefixPath(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const parts = path.split('/').filter(Boolean);

  let pattern = '^';
  for (const part of parts) {
    if (part === '*' || part === '**') {
      paramNames.push('*');
      pattern += '/(.+)';
    } else if (part.startsWith(':')) {
      paramNames.push(part.slice(1));
      pattern += '/([^/]+)';
    } else {
      pattern += '/' + escapeRegex(part);
    }
  }

  return { regex: new RegExp(pattern), paramNames };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Match a pathname against a single route (exact match)
// ---------------------------------------------------------------------------

/**
 * `decodeURIComponent` wrapper that returns `null` on `URIError`.
 * Malformed percent-encoding in the URL (a stray `%` or `%G0` from a
 * crawler / fuzzer) would otherwise throw straight through the matcher
 * into framework-level 500 handling. Returning null lets the caller
 * treat the URL as no-match (the right answer: malformed input is a
 * 404, not a server error).
 */
function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

/**
 * Decode every captured group into `params`, returning `null` if any
 * group has invalid percent-encoding. Bails on the first failure so
 * routes with multiple params aren't half-populated.
 */
function decodeParams(
  paramNames: readonly string[],
  match: RegExpExecArray,
  out: Record<string, string>,
): boolean {
  for (let i = 0; i < paramNames.length; i++) {
    const decoded = safeDecode(match[i + 1]);
    if (decoded === null) return false;
    out[paramNames[i]] = decoded;
  }
  return true;
}

export function matchPath(
  pathname: string,
  route: NormalizedRoute
): Record<string, string> | null {
  const match = route.regex.exec(pathname);
  if (!match) return null;

  const params: Record<string, string> = {};
  if (!decodeParams(route.paramNames, match, params)) return null;
  return params;
}

// ---------------------------------------------------------------------------
// Match a pathname against the entire route tree.
// Returns the chain of matches from root to leaf, or null if no match.
//
// The key insight: parent routes are matched as PREFIXES of the pathname.
// The remaining unmatched portion is then matched against children using
// the children's OWN path (relative), not their fullPath.
// ---------------------------------------------------------------------------

export function matchRouteTree(
  pathname: string,
  routes: NormalizedRoute[]
): RouteMatch[] | null {
  for (const route of routes) {
    const result = matchRouteRecursive(pathname, route);
    if (result) return result;
  }
  return null;
}

function matchRouteRecursive(
  pathname: string,
  route: NormalizedRoute
): RouteMatch[] | null {
  if (route.children.length > 0) {
    // Parent route: match as prefix, then try children on remaining path
    const prefixMatch = matchAsPrefix(pathname, route);
    if (!prefixMatch) return null;

    const { params, remaining } = prefixMatch;

    // Try each child against the remaining path
    for (const child of route.children) {
      // Match child using its own compiled regex (which is based on fullPath)
      // but we need to match the remaining path using the child's relative path
      const childMatch = matchChildRoute(remaining, child);
      if (childMatch) {
        return [{ route, params }, ...childMatch];
      }
    }

    // If no child matched but this route has a component and the pathname matches exactly
    if (route.component || route.lazy) {
      const exactMatch = matchPath(pathname, route);
      if (exactMatch) {
        return [{ route, params: exactMatch }];
      }
    }

    return null;
  }

  // Leaf route: exact match
  const params = matchPath(pathname, route);
  if (!params) return null;
  return [{ route, params }];
}

/**
 * Match a child route against a remaining path.
 * Uses the child's own relative path for matching.
 */
function matchChildRoute(
  remaining: string,
  child: NormalizedRoute
): RouteMatch[] | null {
  // Get the child's own path segments (not fullPath - that includes parent prefix)
  const ownPath = child.segments;

  // Compile a regex from the child's own segments
  const { regex, paramNames } = compileSegments(ownPath);

  if (child.children.length > 0) {
    // Child is also a parent - match as prefix
    const { regex: prefixRegex, paramNames: prefixParamNames } = compilePrefixSegments(ownPath);
    const prefixMatch = prefixRegex.exec(remaining);
    if (!prefixMatch) return null;

    const params: Record<string, string> = {};
    if (!decodeParams(prefixParamNames, prefixMatch, params)) return null;

    const matched = prefixMatch[0];
    const childRemaining = remaining.slice(matched.length) || '/';

    for (const grandchild of child.children) {
      const grandchildMatch = matchChildRoute(childRemaining, grandchild);
      if (grandchildMatch) {
        return [{ route: child, params }, ...grandchildMatch];
      }
    }

    // Check exact match on this child
    const exactMatch = regex.exec(remaining);
    if (exactMatch && (child.component || child.lazy)) {
      const exactParams: Record<string, string> = {};
      if (!decodeParams(paramNames, exactMatch, exactParams)) return null;
      return [{ route: child, params: exactParams }];
    }

    return null;
  }

  // Leaf child: exact match against remaining path
  const match = regex.exec(remaining);
  if (!match) return null;

  const params: Record<string, string> = {};
  if (!decodeParams(paramNames, match, params)) return null;
  return [{ route: child, params }];
}

/**
 * Compile RouteSegments into a regex for exact matching.
 */
function compileSegments(segments: RouteSegment[]): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  let pattern = '^';

  for (const seg of segments) {
    if (seg.type === 'wildcard') {
      paramNames.push('*');
      pattern += '/(.+)';
    } else if (seg.type === 'param') {
      paramNames.push(seg.value);
      pattern += '/([^/]+)';
    } else {
      pattern += '/' + escapeRegex(seg.value);
    }
  }

  if (pattern === '^') pattern = '^/';
  pattern += '/?$';

  return { regex: new RegExp(pattern), paramNames };
}

/**
 * Compile RouteSegments into a prefix regex (no end anchor).
 */
function compilePrefixSegments(segments: RouteSegment[]): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  let pattern = '^';

  for (const seg of segments) {
    if (seg.type === 'wildcard') {
      paramNames.push('*');
      pattern += '/(.+)';
    } else if (seg.type === 'param') {
      paramNames.push(seg.value);
      pattern += '/([^/]+)';
    } else {
      pattern += '/' + escapeRegex(seg.value);
    }
  }

  return { regex: new RegExp(pattern), paramNames };
}

/**
 * Match a route as a prefix of the pathname.
 */
function matchAsPrefix(
  pathname: string,
  route: NormalizedRoute
): { params: Record<string, string>; remaining: string } | null {
  const { regex, paramNames } = compilePrefixPath(route.fullPath);

  // For root path routes, everything is remaining
  if (route.fullPath === '/' || route.fullPath === '') {
    if (!pathname.startsWith('/')) return null;
    return { params: {}, remaining: pathname };
  }

  const match = regex.exec(pathname);
  if (!match) return null;

  const params: Record<string, string> = {};
  if (!decodeParams(paramNames, match, params)) return null;

  const matched = match[0];
  const remaining = pathname.slice(matched.length) || '/';

  return { params, remaining };
}
