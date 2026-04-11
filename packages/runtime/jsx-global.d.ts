/**
 * Global JSX namespace declaration for Mikata.
 *
 * Include this file in your tsconfig "include" or "types" to get
 * JSX type checking in .tsx files without explicit imports.
 *
 * Usage in tsconfig.json:
 *   {
 *     "compilerOptions": {
 *       "jsx": "preserve",
 *       "types": ["@mikata/runtime/jsx-global"]
 *     }
 *   }
 *
 * Or add to "include":
 *   "include": ["src", "node_modules/@mikata/runtime/jsx-global.d.ts"]
 */
import type { JSX as MikataJSX } from './src/jsx';

declare global {
  namespace JSX {
    type Element = MikataJSX.Element;
    interface ElementChildrenAttribute extends MikataJSX.ElementChildrenAttribute {}
    interface IntrinsicElements extends MikataJSX.IntrinsicElements {}
  }
}

export {};
