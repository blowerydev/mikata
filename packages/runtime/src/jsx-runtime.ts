/**
 * JSX runtime entry point.
 *
 * This module re-exports the JSX namespace so that TypeScript can
 * resolve JSX types when using jsxImportSource: "@mikata/runtime".
 *
 * For projects using jsx: "preserve", import this module or use
 * the global type declarations from jsx-global.d.ts instead.
 */
export { JSX } from './jsx';
