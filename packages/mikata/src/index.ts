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
  hydrate,
  _createElement,
  _setProp,
  _insert,
  _createFragment,
  _createComponent,
  _spread,
  _mergeProps,
  mergeProps,
  reactiveProps,
  splitProps,
  disposeComponent,
  onMount,
  createRef,
  show,
  each,
  switchMatch,
  Dynamic,
  RawHTML,
  portal,
  model,
  createContext,
  provide,
  inject,
  ErrorBoundary,
  installErrorOverlay,
  uninstallErrorOverlay,
  reportOverlayError,
} from '@mikata/runtime';

export type { Context, Ref, RenderOptions } from '@mikata/runtime';

// Store
export {
  createStore,
  derived,
  createSelector,
  createQuery,
  createMutation,
  invalidateTag,
  invalidateTags,
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

// Form
export {
  createForm,
  getPath,
  setPath,
} from '@mikata/form';

export type {
  FormOptions,
  FormError,
  FormErrors,
  FieldValidator,
  ValidatorObject,
  ValidatorFunction,
  ValidatorResolver,
  ValidatorSpec,
  GetInputPropsOptions,
  InputProps,
  MikataForm,
} from '@mikata/form';

// Icons
export { createIcon } from '@mikata/icons';

export type {
  IconNode,
  ReadonlyIconNode,
  IconProps,
  IconAttrs,
  IconChild,
} from '@mikata/icons';

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
