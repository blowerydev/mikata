// Re-export everything from sub-packages for convenient single-import usage
// import { signal, render, createStore, show } from 'mikata';

// Reactivity
export {
  signal,
  isSignal,
  computed,
  reactive,
  isReactive,
  toRaw,
  effect,
  renderEffect,
  untrack,
  batch,
  on,
  createScope,
  onCleanup,
  getCurrentScope,
  flushSync,
} from '@mikata/reactivity';

export type {
  Signal,
  ReadSignal,
  WriteSignal,
  Scope,
  ReactiveNode,
} from '@mikata/reactivity';

// Runtime
export {
  render,
  _createElement,
  _setProp,
  _insert,
  _createFragment,
  _createComponent,
  _spread,
  _mergeProps,
  _destructureProps,
  disposeComponent,
  onMount,
  createRef,
  show,
  each,
  switchMatch,
  portal,
  model,
  createContext,
  provide,
  inject,
  ErrorBoundary,
} from '@mikata/runtime';

export type { Context, Ref } from '@mikata/runtime';

// Store
export {
  createStore,
  derived,
  createSelector,
  createQuery,
  createMutation,
} from '@mikata/store';

export type {
  SetStoreFunction,
  QueryOptions,
  QueryResult,
  MutationOptions,
  MutationResult,
} from '@mikata/store';

// i18n
export {
  createI18n,
  provideI18n,
  useI18n,
} from '@mikata/i18n';

export type {
  I18nOptions,
  I18nInstance,
  TranslateFunction,
  Formatters,
  TranslationKeys,
  PluralCategory,
  PluralMessages,
} from '@mikata/i18n';

// Router
export {
  createRouter,
  defineRoutes,
  searchParam,
  provideRouter,
  routeOutlet,
  Link,
  useRouter,
  useParams,
  useSearchParams,
  useGuard,
  useMatch,
} from '@mikata/router';

export type {
  RouteDefinition,
  RouterOptions,
  Router,
  MatchedRoute,
  NavigateTarget,
  RouteGuard,
  SearchParamDef,
} from '@mikata/router';
