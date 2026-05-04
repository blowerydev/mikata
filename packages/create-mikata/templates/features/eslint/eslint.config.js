import tseslint from 'typescript-eslint';
import mikata from '@mikata/eslint-plugin';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { mikata },
    rules: {
      'mikata/no-async-component': 'error',
      'mikata/rules-of-setup': 'error',
      'mikata/no-destructured-props': 'warn',
      'mikata/require-effect-cleanup': 'warn',
      'mikata/no-signal-write-in-computed': 'error',
      'mikata/require-signal-call': 'error',
      'mikata/no-signal-assignment': 'error',
      'mikata/no-stale-signal-read-in-effect': 'error',
      'mikata/prefer-selector-in-each': 'warn',
      'mikata/no-discarded-redirect': 'error', // @line-if:kit
      'mikata/no-api-route-default-export': 'error', // @line-if:kit
    },
  }
);
