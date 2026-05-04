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
import { requireEffectCleanup } from './rules/require-effect-cleanup';
import { noSignalWriteInComputed } from './rules/no-signal-write-in-computed';
import { requireSignalCall } from './rules/require-signal-call';
import { noSignalAssignment } from './rules/no-signal-assignment';
import { noStaleSignalReadInEffect } from './rules/no-stale-signal-read-in-effect';
import { noDiscardedRedirect } from './rules/no-discarded-redirect';
import { noApiRouteDefaultExport } from './rules/no-api-route-default-export';
import { noImperativeDomInUi } from './rules/no-imperative-dom-in-ui';
import { preferSelectorInEach } from './rules/prefer-selector-in-each';

const rules: Record<string, Rule.RuleModule> = {
  'rules-of-setup': rulesOfSetup,
  'no-destructured-props': noDestructuredProps,
  'no-async-component': noAsyncComponent,
  'require-effect-cleanup': requireEffectCleanup,
  'no-signal-write-in-computed': noSignalWriteInComputed,
  'require-signal-call': requireSignalCall,
  'no-signal-assignment': noSignalAssignment,
  'no-stale-signal-read-in-effect': noStaleSignalReadInEffect,
  'no-discarded-redirect': noDiscardedRedirect,
  'no-api-route-default-export': noApiRouteDefaultExport,
  'no-imperative-dom-in-ui': noImperativeDomInUi,
  'prefer-selector-in-each': preferSelectorInEach,
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
    '@mikata/require-effect-cleanup': 'error',
    '@mikata/no-signal-write-in-computed': 'error',
    '@mikata/require-signal-call': 'error',
    '@mikata/no-signal-assignment': 'error',
    '@mikata/no-stale-signal-read-in-effect': 'error',
    '@mikata/prefer-selector-in-each': 'warn',
  },
};

// Kit-aware preset: the base rules plus lints that catch @mikata/kit-specific
// mistakes (discarded redirects, default-export-mixed-with-verbs in route files).
const recommendedKitFlat: Linter.FlatConfig = {
  plugins: {
    '@mikata': plugin,
  },
  rules: {
    ...recommendedFlat.rules,
    '@mikata/no-discarded-redirect': 'error',
    '@mikata/no-api-route-default-export': 'error',
  },
};

// Legacy config - `"extends": ["plugin:@mikata/recommended"]`.
const recommendedLegacy: Linter.LegacyConfig = {
  plugins: ['@mikata'],
  rules: recommendedFlat.rules,
};

const recommendedKitLegacy: Linter.LegacyConfig = {
  plugins: ['@mikata'],
  rules: recommendedKitFlat.rules,
};

(plugin.configs as Record<string, unknown>).recommended = recommendedFlat;
(plugin.configs as Record<string, unknown>)['recommended-kit'] = recommendedKitFlat;
(plugin.configs as Record<string, unknown>)['legacy-recommended'] = recommendedLegacy;
(plugin.configs as Record<string, unknown>)['legacy-recommended-kit'] = recommendedKitLegacy;

export default plugin;
export { rules };
