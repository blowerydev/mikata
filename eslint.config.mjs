import tseslint from 'typescript-eslint';
import mikata from './packages/eslint-plugin/dist/index.js';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.pnpm-store/**',
      'llms.txt',
    ],
  },
  {
    // Start with the docs surface and the UI components cleaned up in CI; the
    // rest of @mikata/ui still has existing cleanup warnings to burn down
    // separately.
    files: [
      'apps/docs/src/**/*.{ts,tsx}',
      'packages/ui/src/components/Calendar/**/*.{ts,tsx}',
      'packages/ui/src/components/Checkbox/**/*.{ts,tsx}',
      'packages/ui/src/components/DatePicker/**/*.{ts,tsx}',
      'packages/ui/src/components/MonthPicker/**/*.{ts,tsx}',
      'packages/ui/src/components/Select/**/*.{ts,tsx}',
      'packages/ui/src/components/TextInput/**/*.{ts,tsx}',
      'packages/ui/src/components/YearPicker/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@mikata': mikata,
    },
    rules: {
      '@mikata/require-effect-cleanup': 'error',
    },
  },
);
