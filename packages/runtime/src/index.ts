// DOM helpers (used by compiler output)
export {
  _createElement,
  _setProp,
  _insert,
  _createFragment,
  _spread,
  _mergeProps,
  _template,
  _delegate,
  adoptElement,
} from './dom';

// Public prop helpers. `mergeProps` is the user-facing alias of
// `_mergeProps`; `reactiveProps` wraps a getter map into a props object
// with getter descriptors, for programmatic prop construction outside
// JSX (where the compiler handles getters automatically). `splitProps`
// is the inverse of mergeProps - extracts a typed subset while keeping
// getters live on both halves.
export { mergeProps, reactiveProps, splitProps } from './dom';

// Component model
export {
  _createComponent,
  disposeComponent,
  onMount,
  onCleanup,
  createRef,
} from './component';
export type { Ref } from './component';

// Control flow
export { show, each, switchMatch, Dynamic } from './control-flow';

// Prop helpers
export { createDerivedSignal } from './derived';

// Transitions
export { transition, transitionGroup } from './transition';
export type { TransitionOptions } from './transition';

// Portal
export { portal } from './portal';

// Form bindings
export { model } from './model';

// Subscription hooks
export {
  useEventListener,
  useInterval,
  useTimeout,
  useSubscription,
  useResizeObserver,
  useMutationObserver,
  useIntersectionObserver,
} from './hooks';

// Context
export { createContext, provide, inject } from './context';
export type { Context } from './context';

// Error boundary
export { ErrorBoundary } from './error-boundary';

// Suspense
export { Suspense, SUSPENSE_CONTEXT_KEY } from './suspense';
export type { SuspenseProps, SuspenseBoundary } from './suspense';

// Lazy loading
export { lazy } from './lazy';
export type { LazyOptions } from './lazy';

// Render
export { render, hydrate } from './render';
export type { RenderOptions } from './render';

// Dev-mode error overlay
export {
  installErrorOverlay,
  uninstallErrorOverlay,
  reportOverlayError,
} from './error-overlay';

// HMR (Hot Module Replacement)
export { _registerComponent, _hotReplace } from './hmr';

// DevTools
export { installDevTools } from './devtools';

// SSR env flag (read + toggle — toggle is internal, used by @mikata/server)
export { isSSR, _setSSR } from './env';

// Hydration cursor introspection (used by @mikata/server tests, advanced
// integrations, and custom compiler output).
export { isHydrating } from './adopt';

// JSX types
export type {
  HTMLAttributes,
  DOMEventHandlers,
  AriaAttributes,
  SVGAttributes,
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  FormHTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  VideoHTMLAttributes,
  AudioHTMLAttributes,
} from './jsx';
export type { JSX } from './jsx';
