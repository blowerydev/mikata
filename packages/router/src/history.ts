/**
 * History adapters - thin wrappers around the browser History API,
 * hash-based routing, and in-memory routing (for testing/SSR).
 */

import type { HistoryAdapter, HistoryLocation } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let keyCounter = 0;
function createKey(): string {
  return String(++keyCounter);
}

function parseLocation(base: string): HistoryLocation {
  const { pathname, search, hash } = window.location;
  return {
    pathname: base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname,
    search,
    hash,
    state: window.history.state?._mikata_state ?? null,
    key: window.history.state?._mikata_key ?? createKey(),
  };
}

function wrapState(state: unknown, key: string): Record<string, unknown> {
  return { _mikata_state: state ?? null, _mikata_key: key };
}

// ---------------------------------------------------------------------------
// Browser History
// ---------------------------------------------------------------------------

export function createBrowserHistory(base = ''): HistoryAdapter {
  const listeners = new Set<(loc: HistoryLocation) => void>();
  let currentLocation = parseLocation(base);

  // Ensure initial state has a key
  if (!window.history.state?._mikata_key) {
    window.history.replaceState(
      wrapState(currentLocation.state, currentLocation.key),
      ''
    );
  }

  function onPopState() {
    currentLocation = parseLocation(base);
    for (const fn of listeners) fn(currentLocation);
  }

  window.addEventListener('popstate', onPopState);

  return {
    get location() {
      return currentLocation;
    },

    push(path: string, state?: unknown) {
      const key = createKey();
      const fullPath = base + path;
      window.history.pushState(wrapState(state, key), '', fullPath);
      currentLocation = {
        pathname: path,
        search: '',
        hash: '',
        state: state ?? null,
        key,
      };
      // Parse search and hash from path
      const url = new URL(fullPath, window.location.origin);
      currentLocation.pathname = base ? url.pathname.slice(base.length) || '/' : url.pathname;
      currentLocation.search = url.search;
      currentLocation.hash = url.hash;
      for (const fn of listeners) fn(currentLocation);
    },

    replace(path: string, state?: unknown) {
      const key = currentLocation.key;
      const fullPath = base + path;
      window.history.replaceState(wrapState(state, key), '', fullPath);
      const url = new URL(fullPath, window.location.origin);
      currentLocation = {
        pathname: base ? url.pathname.slice(base.length) || '/' : url.pathname,
        search: url.search,
        hash: url.hash,
        state: state ?? null,
        key,
      };
      for (const fn of listeners) fn(currentLocation);
    },

    go(delta: number) {
      window.history.go(delta);
    },

    listen(callback: (loc: HistoryLocation) => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    dispose() {
      listeners.clear();
      window.removeEventListener('popstate', onPopState);
    },
  };
}

// ---------------------------------------------------------------------------
// Hash History
// ---------------------------------------------------------------------------

export function createHashHistory(): HistoryAdapter {
  const listeners = new Set<(loc: HistoryLocation) => void>();

  function getLocation(): HistoryLocation {
    const hash = window.location.hash.slice(1) || '/';
    const [pathAndSearch, fragment] = hash.split('#');
    const [pathname, search] = (pathAndSearch || '/').split('?');
    return {
      pathname: pathname || '/',
      search: search ? `?${search}` : '',
      hash: fragment ? `#${fragment}` : '',
      state: window.history.state?._mikata_state ?? null,
      key: window.history.state?._mikata_key ?? createKey(),
    };
  }

  let currentLocation = getLocation();

  function onHashChange() {
    currentLocation = getLocation();
    for (const fn of listeners) fn(currentLocation);
  }

  window.addEventListener('hashchange', onHashChange);

  return {
    get location() {
      return currentLocation;
    },

    push(path: string, state?: unknown) {
      const key = createKey();
      window.history.pushState(wrapState(state, key), '', `#${path}`);
      currentLocation = getLocation();
      currentLocation.key = key;
      currentLocation.state = state ?? null;
      for (const fn of listeners) fn(currentLocation);
    },

    replace(path: string, state?: unknown) {
      const key = currentLocation.key;
      window.history.replaceState(wrapState(state, key), '', `#${path}`);
      currentLocation = getLocation();
      currentLocation.key = key;
      currentLocation.state = state ?? null;
      for (const fn of listeners) fn(currentLocation);
    },

    go(delta: number) {
      window.history.go(delta);
    },

    listen(callback: (loc: HistoryLocation) => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    dispose() {
      listeners.clear();
      window.removeEventListener('hashchange', onHashChange);
    },
  };
}

// ---------------------------------------------------------------------------
// Memory History (for testing and SSR)
// ---------------------------------------------------------------------------

export function createMemoryHistory(initialPath = '/'): HistoryAdapter {
  const listeners = new Set<(loc: HistoryLocation) => void>();

  interface Entry {
    location: HistoryLocation;
  }

  function makeLocation(path: string, state?: unknown): HistoryLocation {
    const [pathAndSearch, hash] = path.split('#');
    const [pathname, search] = (pathAndSearch || '/').split('?');
    return {
      pathname: pathname || '/',
      search: search ? `?${search}` : '',
      hash: hash ? `#${hash}` : '',
      state: state ?? null,
      key: createKey(),
    };
  }

  const entries: Entry[] = [{ location: makeLocation(initialPath) }];
  let index = 0;

  return {
    get location() {
      return entries[index].location;
    },

    push(path: string, state?: unknown) {
      // Remove forward entries
      entries.splice(index + 1);
      const location = makeLocation(path, state);
      entries.push({ location });
      index = entries.length - 1;
      for (const fn of listeners) fn(location);
    },

    replace(path: string, state?: unknown) {
      const location = makeLocation(path, state);
      location.key = entries[index].location.key;
      entries[index] = { location };
      for (const fn of listeners) fn(location);
    },

    go(delta: number) {
      const newIndex = Math.max(0, Math.min(entries.length - 1, index + delta));
      if (newIndex === index) return;
      index = newIndex;
      for (const fn of listeners) fn(entries[index].location);
    },

    listen(callback: (loc: HistoryLocation) => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    dispose() {
      listeners.clear();
    },
  };
}
