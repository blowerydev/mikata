export type Feature =
  | 'router'
  | 'ui'
  | 'icons'
  | 'form'
  | 'i18n'
  | 'store'
  | 'testing'
  | 'eslint'
  | 'tailwind';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export interface ResolvedConfig {
  name: string;
  features: Feature[];
  pm: PackageManager;
}
