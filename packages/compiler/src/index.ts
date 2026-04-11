/**
 * @mikata/compiler — Vite plugin for Mikata JSX transform.
 *
 * Transforms JSX in .tsx/.jsx files into direct DOM operations
 * using @mikata/runtime helpers. No virtual DOM.
 */

import type { Plugin } from 'vite';
import { transformSync } from '@babel/core';
import { mikataJSXPlugin } from './transform';

export interface MikataPluginOptions {
  /** Enable development mode warnings and diagnostics */
  dev?: boolean;
}

export default function mikata(options: MikataPluginOptions = {}): Plugin {
  const isDev = options.dev ?? true;

  return {
    name: 'mikata-jsx',
    enforce: 'pre',

    config() {
      return {
        esbuild: {
          jsx: 'preserve', // Let our plugin handle JSX, not esbuild
        },
        define: {
          __DEV__: JSON.stringify(isDev),
        },
      };
    },

    transform(code, id) {
      if (!/\.[tj]sx$/.test(id)) return null;

      const result = transformSync(code, {
        filename: id,
        plugins: [
          ['@babel/plugin-syntax-typescript', { isTSX: true }],
          mikataJSXPlugin,
        ],
        sourceMaps: true,
      });

      if (!result || !result.code) return null;

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}

export { mikataJSXPlugin } from './transform';
