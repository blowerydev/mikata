// Router creation
export { createRouter } from './router';

// History adapters (mainly for tests / SSR)
export {
  createBrowserHistory,
  createHashHistory,
  createMemoryHistory,
} from './history';

// Testing helpers
export { createTestRouter } from './testing';
export type { TestRouterOptions } from './testing';

// Route definition
export { defineRoutes } from './route-definition';
export { searchParam } from './search-params';

// Rendering
export { provideRouter, routeOutlet } from './outlet';

// Navigation component
export { Link } from './link';
export type { LinkProps } from './link';

// Hooks
export {
  useRouter,
  useParams,
  useSearchParams,
  useGuard,
  useMatch,
  useRoute,
} from './hooks';

// Types
export type {
  RouteDefinition,
  RouterOptions,
  Router,
  MatchedRoute,
  RouteMatch,
  NavigateTarget,
  NavigateOptions,
  RouteGuard,
  GuardResult,
  SearchParamDef,
  ScrollBehaviorOption,
  ReadSignal,
  TransitionOptions,
  HistoryAdapter,
  HistoryLocation,
  ExtractParams,
  PathParams,
  InferSearchSchema,
} from './types';
