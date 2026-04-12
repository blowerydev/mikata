// DOM helpers (used by compiler output)
export {
  _createElement,
  _setProp,
  _insert,
  _createFragment,
  _spread,
  _mergeProps,
} from './dom';

// Component model
export {
  _createComponent,
  disposeComponent,
  onMount,
  onCleanup,
  _destructureProps,
  createRef,
} from './component';
export type { Ref } from './component';

// Control flow
export { show, each, switchMatch } from './control-flow';

// Transitions
export { transition, transitionGroup } from './transition';
export type { TransitionOptions } from './transition';

// Portal
export { portal } from './portal';

// Form bindings
export { model } from './model';

// Context
export { createContext, provide, inject } from './context';
export type { Context } from './context';

// Error boundary
export { ErrorBoundary } from './error-boundary';

// Lazy loading
export { lazy } from './lazy';
export type { LazyOptions } from './lazy';

// Render
export { render } from './render';
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
