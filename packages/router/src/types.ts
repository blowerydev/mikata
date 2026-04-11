/**
 * Core types for @mikata/router.
 */

import type { TransitionOptions } from '@mikata/runtime';
export type { TransitionOptions } from '@mikata/runtime';

declare const __DEV__: boolean;

// ---------------------------------------------------------------------------
// Search Param Definitions
// ---------------------------------------------------------------------------

export interface SearchParamDef<T = unknown> {
  parse: (raw: string | null) => T;
  serialize: (value: T) => string;
  defaultValue: T;
}

// ---------------------------------------------------------------------------
// Route Definition
// ---------------------------------------------------------------------------

export interface RouteDefinition<
  TPath extends string = string,
  TSearch extends Record<string, SearchParamDef> = Record<string, SearchParamDef>,
> {
  /** URL path pattern (e.g., '/users/:id'). Relative to parent route. */
  path: TPath;

  /** Component to render for this route. */
  component?: () => Node;

  /** Lazy-loaded component via dynamic import. */
  lazy?: () => Promise<{ default: (props: any) => Node | null }>;

  /** Child routes (nested under this route's outlet). */
  children?: RouteDefinition[];

  /** Search param schema for typed query string parsing. */
  search?: TSearch;

  /** Navigation guard for this route (inherits to children). */
  guard?: RouteGuard;

  /** Arbitrary metadata (e.g., page title, layout hints, permissions). */
  meta?: Record<string, unknown>;

  /** Per-route transition override. */
  transition?: TransitionOptions;
}

// ---------------------------------------------------------------------------
// Normalized Route (internal, after tree processing)
// ---------------------------------------------------------------------------

export interface NormalizedRoute {
  /** Full resolved path (e.g., '/users/:id/posts'). */
  fullPath: string;

  /** Path segments for matching. */
  segments: RouteSegment[];

  /** Compiled regex for matching. */
  regex: RegExp;

  /** Param names extracted from path. */
  paramNames: string[];

  /** Component factory. */
  component?: () => Node;

  /** Lazy loader. */
  lazy?: () => Promise<{ default: (props: any) => Node | null }>;

  /** Search param schema. */
  search?: Record<string, SearchParamDef>;

  /** Guard. */
  guard?: RouteGuard;

  /** Meta. */
  meta: Record<string, unknown>;

  /** Transition. */
  transition?: TransitionOptions;

  /** Children (normalized). */
  children: NormalizedRoute[];

  /** Reference to parent (for building match chain). */
  parent: NormalizedRoute | null;
}

export interface RouteSegment {
  type: 'static' | 'param' | 'wildcard';
  value: string; // static text or param name
}

// ---------------------------------------------------------------------------
// Matched Route
// ---------------------------------------------------------------------------

export interface MatchedRoute {
  /** Full matched path. */
  path: string;

  /** Extracted path params. */
  params: Record<string, string>;

  /** Parsed search params. */
  searchParams: Record<string, unknown>;

  /** Route metadata (merged from all matched ancestors). */
  meta: Record<string, unknown>;

  /** Hash fragment (without #). */
  hash: string;

  /** Chain of matched routes from root to leaf (for nested outlets). */
  matches: RouteMatch[];
}

export interface RouteMatch {
  route: NormalizedRoute;
  params: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export type GuardResult =
  | void       // allow
  | true       // allow (explicit)
  | false      // block
  | string     // redirect to path
  | NavigateTarget; // redirect to structured target

export type RouteGuard = (
  to: MatchedRoute,
  from: MatchedRoute | null,
) => GuardResult | Promise<GuardResult>;

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export type NavigateTarget = string | {
  path: string;
  params?: Record<string, string | number>;
  search?: Record<string, unknown>;
  hash?: string;
};

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
  scroll?: boolean | { x: number; y: number };
}

// ---------------------------------------------------------------------------
// Scroll Behavior
// ---------------------------------------------------------------------------

export type ScrollBehaviorOption = 'auto' | 'smooth' | {
  behavior?: ScrollBehavior;
  /** CSS selectors for nested scrollable containers to save/restore. */
  selectors?: string[];
};

// ---------------------------------------------------------------------------
// Router Options
// ---------------------------------------------------------------------------

export interface RouterOptions {
  routes: RouteDefinition[];
  history?: 'browser' | 'hash' | 'memory';
  base?: string;
  scrollBehavior?: ScrollBehaviorOption | false;
  transition?: TransitionOptions;
  notFound?: () => Node;
  beforeNavigate?: RouteGuard | RouteGuard[];
  afterNavigate?: ((to: MatchedRoute, from: MatchedRoute | null) => void) | Array<(to: MatchedRoute, from: MatchedRoute | null) => void>;
  /** Default fallback for lazy-loaded route components. */
  lazyFallback?: () => Node;
}

// ---------------------------------------------------------------------------
// Router Instance
// ---------------------------------------------------------------------------

export type ReadSignal<T> = () => T;

export interface Router {
  /** Current matched route (reactive). */
  route: ReadSignal<MatchedRoute>;

  /** Current path params (reactive). */
  params: ReadSignal<Record<string, string>>;

  /** Current parsed search params (reactive). */
  searchParams: ReadSignal<Record<string, unknown>>;

  /** Current pathname (reactive). */
  path: ReadSignal<string>;

  /** Current hash without # (reactive). */
  hash: ReadSignal<string>;

  /** Whether a navigation is in progress (reactive). */
  isNavigating: ReadSignal<boolean>;

  /** Navigate to a new route. */
  navigate(to: NavigateTarget, options?: NavigateOptions): Promise<void>;

  /** Go back in history. */
  back(): void;

  /** Go forward in history. */
  forward(): void;

  /** Go delta steps in history. */
  go(delta: number): void;

  /** Update search params without full navigation. */
  setSearchParams(
    updater: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)
  ): void;

  /** Dispose the router and all listeners. */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// History Adapter
// ---------------------------------------------------------------------------

export interface HistoryAdapter {
  readonly location: HistoryLocation;
  push(path: string, state?: unknown): void;
  replace(path: string, state?: unknown): void;
  go(delta: number): void;
  listen(callback: (location: HistoryLocation) => void): () => void;
  dispose(): void;
}

export interface HistoryLocation {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  key: string;
}
