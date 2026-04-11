// Router creation
export { createRouter } from './router';

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
} from './types';
