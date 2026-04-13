/**
 * @mikata/eslint-plugin - lint rules that catch common Mikata misuse.
 *
 * Flat-config usage:
 *
 * ```js
 * import mikata from '@mikata/eslint-plugin';
 *
 * export default [
 *   mikata.configs.recommended,
 * ];
 * ```
 *
 * Legacy `.eslintrc` usage:
 *
 * ```json
 * {
 *   "plugins": ["@mikata"],
 *   "extends": ["plugin:@mikata/recommended"]
 * }
 * ```
 */

import type { ESLint, Linter, Rule } from 'eslint';
import { rulesOfSetup } from './rules/rules-of-setup';
import { noDestructuredProps } from './rules/no-destructured-props';
import { noAsyncComponent } from './rules/no-async-component';

const rules: Record<string, Rule.RuleModule> = {
  'rules-of-setup': rulesOfSetup,
  'no-destructured-props': noDestructuredProps,
  'no-async-component': noAsyncComponent,
};

const plugin: ESLint.Plugin = {
  meta: {
    name: '@mikata/eslint-plugin',
    version: '0.1.0',
  },
  rules,
  configs: {},
};

// Flat config - the user spreads this directly.
const recommendedFlat: Linter.FlatConfig = {
  plugins: {
    '@mikata': plugin,
  },
  rules: {
    '@mikata/rules-of-setup': 'error',
    '@mikata/no-destructured-props': 'error',
    '@mikata/no-async-component': 'error',
  },
};

// Legacy config - `"extends": ["plugin:@mikata/recommended"]`.
const recommendedLegacy: Linter.LegacyConfig = {
  plugins: ['@mikata'],
  rules: recommendedFlat.rules,
};

(plugin.configs as Record<string, unknown>).recommended = recommendedFlat;
(plugin.configs as Record<string, unknown>)['legacy-recommended'] = recommendedLegacy;

export default plugin;
export { rules };
