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
    },
  }
);
